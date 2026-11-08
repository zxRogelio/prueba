import { createHash } from "node:crypto";
import { sequelize } from "../config/sequelize.js";
import { User, Session, UserSubscription, Order, Payment, AccessQrToken, TrainerProfile } from "../models/index.js";
import { AccountCancellationRequest, AccountCancellationEvent, UserPersonalData, ReauthenticationChallenge, ReauthenticationProof } from "../models/Privacy.js";
import { approvedDeletionPolicy, RETAINED_CATEGORIES } from "../config/accountDeletionPolicy.js";
import { exactObject, isUuid, reject } from "../utils/privacyValidation.js";

const OPEN = ["pending_review", "under_review", "awaiting_policy"];
const TRANSITIONS = { pending_review: ["under_review"], under_review: ["awaiting_policy", "rejected", "completed"], awaiting_policy: ["under_review", "rejected", "completed"] };
export const cancellationView = (row) => ({ requestId: row.id, status: row.status, createdAt: row.createdAt,
  resolvedAt: row.resolvedAt ?? null, membershipImpact: row.membershipImpact, retentionSummary: row.retentionSummary,
  version: row.version ?? 1, resolutionCode: row.resolutionCode ?? null });
const missing = () => reject(404, "CANCELLATION_NOT_FOUND", "Solicitud no encontrada.");
const adminOnly = (user) => { if (!user || user.deletionCompletedAt || user.role !== "administrador") reject(403, "FORBIDDEN", "Se requiere autorización administrativa."); };

export async function listAdministrativeCancellations(actor, query = {}) {
  adminOnly(actor);
  const status = query.status ?? "pending_review";
  const page = Number(query.page ?? 1);
  if (![...OPEN, "rejected", "completed"].includes(status) || !Number.isSafeInteger(page) || page < 1 || page > 10000 ||
      Object.keys(query).some((key) => !["status", "page"].includes(key))) reject(422, "INVALID_INPUT", "Filtros inválidos.");
  const rows = await AccountCancellationRequest.findAll({ where: { status }, order: [["createdAt", "ASC"], ["id", "ASC"]], limit: 51, offset: (page - 1) * 50 });
  return { requests: rows.slice(0, 50).map((row) => ({ ...cancellationView(row), userId: row.userId })), page, hasMore: rows.length > 50 };
}
async function dependencies(userId, transaction) {
  // Selected fields only: never serialize whole financial/provider records.
  const related = {};
  for (const [name, model] of [["memberships", UserSubscription], ["orders", Order], ["payments", Payment]]) {
    const rows = await model.findAll({ where: { userId }, attributes: ["id", "status"], transaction });
    related[name] = { count: rows.length, records: rows.slice(0, 100).map((row) => ({ id: row.id, status: row.status })),
      requiresReview: rows.some((row) => !({ memberships: ["expired", "cancelled"], orders: ["cancelled", "refunded"], payments: ["paid", "failed", "cancelled", "refunded", "charged_back"] }[name].includes(row.status))) };
  }
  return related;
}
export async function administrativeCancellationDetail(actor, id) {
  adminOnly(actor); if (!isUuid(id)) missing();
  const row = await AccountCancellationRequest.findByPk(id); if (!row) missing();
  const events = await AccountCancellationEvent.findAll({ where: { requestId: id }, order: [["version", "ASC"]] });
  return { ...cancellationView(row), userId: row.userId, related: await dependencies(row.userId),
    events: events.map((event) => ({ eventId: event.id, actorId: event.actorId, fromStatus: event.fromStatus, toStatus: event.toStatus,
      reasonCode: event.reasonCode, policyId: event.policyId, policySha256: event.policySha256, version: event.version, recordedAt: event.recordedAt })) };
}
export async function decideCancellation(actor, sessionId, id, body, key) {
  adminOnly(actor);
  exactObject(body, ["status", "version", "reasonCode"], ["status", "version", "reasonCode"]);
  if (!isUuid(id) || !isUuid(key) || !Number.isSafeInteger(body.version) || body.version < 1 ||
      typeof body.reasonCode !== "string" || !/^[A-Z][A-Z0-9_]{2,79}$/.test(body.reasonCode)) reject(422, "INVALID_INPUT", "Decisión inválida.");
  const commandHash = createHash("sha256").update(JSON.stringify([actor.id, body.status, body.version, body.reasonCode])).digest("hex");
  return sequelize.transaction(async (transaction) => {
    // Serializes decisions for this request; requester creation uses the user lock.
    const row = await AccountCancellationRequest.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
    if (!row) missing();
    const acting = await User.findByPk(actor.id, { transaction, lock: transaction.LOCK.UPDATE }); adminOnly(acting);
    const session = await Session.findOne({ where: { id: sessionId, userId: actor.id, revoked: false }, transaction, lock: transaction.LOCK.UPDATE });
    if (!session || new Date(session.expiresAt).getTime() <= Date.now()) reject(401, "UNAUTHORIZED", "Sesión no vigente.");
    if (row.userId === actor.id) reject(403, "SELF_REVIEW_FORBIDDEN", "Otro administrador debe revisar tu solicitud.");
    const previous = await AccountCancellationEvent.findOne({ where: { requestId: id, idempotencyKey: key }, transaction });
    if (previous) {
      if (previous.commandHash !== commandHash) reject(409, "IDEMPOTENCY_CONFLICT", "La clave ya corresponde a otra decisión.");
      return cancellationView(row);
    }
    if ((row.version ?? 1) !== body.version) reject(409, "CANCELLATION_VERSION_CHANGED", "La solicitud cambió. Consulta de nuevo.");
    if (!TRANSITIONS[row.status]?.includes(body.status)) reject(409, "INVALID_CANCELLATION_TRANSITION", "Transición no permitida.");
    let policy;
    if (body.status === "completed") {
      // No policy is shipped. Supplying status=completed or an approval in HTTP
      // can never bypass this server-side, hash-bound approval gate.
      policy = approvedDeletionPolicy();
      const owner = await User.findByPk(row.userId, { transaction, lock: transaction.LOCK.UPDATE });
      if (!owner || owner.deletionCompletedAt) reject(409, "ACCOUNT_NOT_AVAILABLE", "La cuenta no está disponible.");
      const related = await dependencies(row.userId, transaction);
      if (Object.values(related).some((value) => value.requiresReview)) reject(409, "FINANCIAL_REVIEW_REQUIRED", "Resuelve las obligaciones y entregas antes de completar la eliminación.");
      // No Users.destroy(), cascades, finance writes, refunds or provider calls.
      await owner.update({ deletionCompletedAt: new Date(), email: `deleted-${owner.id}@account.invalid`, password: null,
        providerId: null, accessToken: null, otp: null, otpExpires: null, verificationOtp: null, verificationOtpExpires: null,
        totpSecret: null, isVerified: false }, { transaction });
      await UserPersonalData.update({ fullName: null, phone: null }, { where: { userId: row.userId }, transaction });
      await TrainerProfile.update({ fullName: null, phone: null }, { where: { trainerId: row.userId }, transaction });
      await Session.update({ revoked: true }, { where: { userId: row.userId }, transaction });
      await AccessQrToken.update({ usedAt: new Date() }, { where: { userId: row.userId }, transaction });
      for (const model of [ReauthenticationChallenge, ReauthenticationProof]) await model.update({ consumedAt: new Date() }, { where: { userId: row.userId }, transaction });
    }
    const fromStatus = row.status;
    const version = (row.version ?? 1) + 1;
    await row.update({ status: body.status, version, resolutionCode: body.reasonCode,
      resolvedAt: ["rejected", "completed"].includes(body.status) ? new Date() : null,
      ...(policy ? { retentionSummary: RETAINED_CATEGORIES.map((category) => ({ category, policyStatus: "approved",
        reason: policy.retention[category].reason, retainUntil: policy.retention[category].retainUntil })) } : {}) }, { transaction });
    await AccountCancellationEvent.create({ requestId: id, actorId: actor.id, idempotencyKey: key, commandHash,
      fromStatus, toStatus: body.status, reasonCode: body.reasonCode, policyId: policy?.id ?? null,
      policySha256: policy ? process.env.ACCOUNT_DELETION_POLICY_SHA256 : null, version, recordedAt: new Date() }, { transaction });
    return cancellationView(row);
  });
}
