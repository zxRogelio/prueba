import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import bcrypt from "bcrypt";
import speakeasy from "speakeasy";
import { Op } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { Session } from "../models/Session.js";
import { ReauthenticationChallenge, ReauthenticationProof, AccountCancellationRequest } from "../models/Privacy.js";
import { lockPrivacyUser } from "./privacyService.js";
import { sendCancellationOTP } from "../utils/sendEmailBrevo.js";
import { exactObject, isUuid, reject } from "../utils/privacyValidation.js";

const PURPOSE = "account-cancellation";
const TTL = 5 * 60000;
const hash = (text) => createHash("sha256").update(text).digest("hex");
const keyedHash = (text) => createHmac("sha256", process.env.JWT_SECRET).update(text).digest("hex");
const credentialHash = (user) => keyedHash(JSON.stringify([user.password, user.totpSecret, user.authMethod, user.provider, user.isVerified]));
const sameHash = (a, b) => typeof a === "string" && typeof b === "string" && a.length === b.length &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const reauthError = () => reject(403, "REAUTHENTICATION_REQUIRED", "Se requiere una reautenticación vigente para esta operación.");

// Check again inside the sensitive transaction; logout/expiry during a request
// must not authorize creation or consumption of a proof.
async function activeSession(userId, sessionId, transaction) {
  const row = await Session.findOne({ where: { id: sessionId, userId, revoked: false }, transaction, lock: transaction.LOCK.UPDATE });
  if (!row || !(new Date(row.expiresAt).getTime() > Date.now())) {
    reject(401, "UNAUTHORIZED", "La sesión ya no está vigente.");
  }
}
async function issueProof(user, sessionId, transaction) {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TTL);
  await ReauthenticationProof.create({ userId: user.id, sessionId, purpose: PURPOSE,
    credentialHash: credentialHash(user), tokenHash: hash(token), expiresAt, consumedAt: null, createdAt: new Date() }, { transaction });
  return { reauthenticationToken: token, expiresAt };
}

export async function reauthenticate(userId, sessionId, body) {
  exactObject(body, ["purpose", "method", "password"], ["purpose", "method"]);
  if (body.purpose !== PURPOSE) reject(422, "INVALID_INPUT", "Propósito inválido.");
  const result = await sequelize.transaction(async (transaction) => {
    const user = await lockPrivacyUser(userId, transaction);
    await activeSession(userId, sessionId, transaction);
    if (!user.password || body.method === "google") {
      reject(409, "REAUTHENTICATION_METHOD_UNAVAILABLE", "La prueba fresca de Google está pendiente de implementación; utiliza el canal ARCO manual.");
    }
    if (body.method !== "password" || typeof body.password !== "string" || !body.password.length || Buffer.byteLength(body.password) > 1024) {
      reject(422, "INVALID_INPUT", "Se requiere la contraseña actual como primer factor.");
    }
    if (!user.isVerified || user.mustChangePassword || !(await bcrypt.compare(body.password, user.password))) return { invalid: true };
    // This bound persists across server restarts and replicas. HTTP rate limiting
    // additionally bounds password attempts before they reach this transaction.
    const recent = await ReauthenticationChallenge.findAll({ where: { userId, createdAt: { [Op.gte]: new Date(Date.now() - TTL) } }, transaction });
    if (recent.length >= 3) reject(429, "REAUTHENTICATION_RATE_LIMITED", "Espera antes de solicitar otro reto.");
    if (user.authMethod === "normal" || !user.authMethod) return { status: 200, body: await issueProof(user, sessionId, transaction) };
    const method = user.authMethod === "totp" ? "totp" : "otp";
    if (method === "totp" && !user.totpSecret) reject(409, "REAUTHENTICATION_METHOD_UNAVAILABLE", "El segundo factor no está configurado.");
    let code;
    if (method === "otp") {
      do { code = randomInt(100000, 1000000).toString(); } while (code === user.otp);
    }
    const challengeId = randomUUID();
    // Bind the OTP MAC to a random challenge, never store an OTP/login secret.
    const row = await ReauthenticationChallenge.create({ id: challengeId, userId, sessionId, purpose: PURPOSE, method,
      credentialHash: credentialHash(user), codeHash: code ? keyedHash(`${challengeId}:${code}`) : null,
      createdAt: new Date(), expiresAt: new Date(Date.now() + TTL), consumedAt: null, attempts: 0,
      // UUID id doubles as the random nonce used for the code MAC.
    }, { transaction });
    return { status: 202, body: { challengeId: row.id, method, expiresAt: row.expiresAt,
      ...(method === "totp" ? { notBefore: new Date((Math.floor(Date.now() / 30000) + 1) * 30000) } : {}) },
    delivery: code ? { email: user.email, code } : null };
  });
  if (result.invalid) reject(403, "REAUTHENTICATION_FAILED", "No se pudo reautenticar la cuenta.");
  if (result.delivery) {
    try { await sendCancellationOTP(result.delivery.email, result.delivery.code); }
    catch {
      // Do not leave an undelivered challenge usable, and never log provider
      // responses, email addresses, credentials or driver diagnostics.
      await ReauthenticationChallenge.update({ consumedAt: new Date() }, { where: { id: result.body.challengeId, userId } });
      reject(503, "REAUTHENTICATION_DELIVERY_FAILED", "No se pudo enviar el código. Intenta más tarde.");
    }
  }
  return { status: result.status, body: result.body };
}

export async function verifyReauthentication(userId, sessionId, body) {
  exactObject(body, ["challengeId", "code"], ["challengeId", "code"]);
  if (!isUuid(body.challengeId) || typeof body.code !== "string" || !/^\d{6}$/.test(body.code)) reject(422, "INVALID_INPUT", "Reto o código inválido.");
  const result = await sequelize.transaction(async (transaction) => {
    const user = await lockPrivacyUser(userId, transaction);
    await activeSession(userId, sessionId, transaction);
    const row = await ReauthenticationChallenge.findOne({ where: { id: body.challengeId, userId, sessionId, purpose: PURPOSE }, transaction, lock: transaction.LOCK.UPDATE });
    if (!row || row.consumedAt || row.attempts >= 5 || new Date(row.expiresAt).getTime() <= Date.now() ||
        !sameHash(row.credentialHash, credentialHash(user))) return null;
    let valid = false;
    if (row.method === "otp") valid = sameHash(row.codeHash, keyedHash(`${row.id}:${body.code}`));
    if (row.method === "totp") {
      const time = Math.floor(Date.now() / 1000);
      const verified = speakeasy.totp.verifyDelta({ secret: user.totpSecret, encoding: "base32", token: body.code, time, window: 1 });
      // A code already available when the challenge began is not a fresh proof.
      valid = Boolean(verified && Math.floor(time / 30) + verified.delta > Math.floor(new Date(row.createdAt).getTime() / 30000));
    }
    await row.update({ attempts: row.attempts + 1, ...(valid || row.attempts >= 4 ? { consumedAt: new Date() } : {}) }, { transaction });
    if (!valid) return null; // commit failed attempts; do not roll them back
    return issueProof(user, sessionId, transaction);
  });
  if (!result) reauthError();
  return result;
}

const requestView = (row) => ({ requestId: row.id, status: row.status, createdAt: row.createdAt,
  resolvedAt: row.resolvedAt ?? null, membershipImpact: row.membershipImpact, retentionSummary: row.retentionSummary });

export async function requestCancellation(userId, sessionId, body, idempotencyKey) {
  exactObject(body, ["confirmation", "reauthenticationToken"], ["confirmation"]);
  if (body.confirmation !== "SOLICITAR CANCELACIÓN") reject(422, "INVALID_CONFIRMATION", "Confirma explícitamente la solicitud de cancelación.");
  if (!isUuid(idempotencyKey)) reject(422, "INVALID_INPUT", "Idempotency-Key debe ser un UUID.");
  if (typeof body.reauthenticationToken !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(body.reauthenticationToken)) reauthError();
  const requestHash = hash(JSON.stringify([body.confirmation, body.reauthenticationToken]));
  return sequelize.transaction(async (transaction) => {
    const user = await lockPrivacyUser(userId, transaction);
    await activeSession(userId, sessionId, transaction);
    const previous = await AccountCancellationRequest.findOne({ where: { userId, idempotencyKey }, transaction });
    if (previous) {
      if (previous.requestHash !== requestHash) reject(409, "IDEMPOTENCY_CONFLICT", "La clave ya corresponde a otra solicitud.");
      return requestView(previous);
    }
    const proof = await ReauthenticationProof.findOne({ where: { userId, sessionId, purpose: PURPOSE,
      tokenHash: hash(body.reauthenticationToken) }, transaction, lock: transaction.LOCK.UPDATE });
    if (!proof || proof.consumedAt || new Date(proof.expiresAt).getTime() <= Date.now() ||
        !sameHash(proof.credentialHash, credentialHash(user))) reauthError();
    if (await AccountCancellationRequest.findOne({ where: { userId, status: "pending_review" }, transaction })) {
      reject(409, "CANCELLATION_ALREADY_PENDING", "Ya existe una solicitud pendiente para esta cuenta.");
    }
    const row = await AccountCancellationRequest.create({ userId, idempotencyKey, requestHash,
      status: "pending_review", createdAt: new Date(), resolvedAt: null,
      membershipImpact: { requiresReview: true },
      retentionSummary: ["payment_records", "orders_and_receipts", "memberships_and_history", "security_and_audit", "backups"].map((category) => ({
        category, policyStatus: "pending_approval", reason: null, retainUntil: null,
      })),
    }, { transaction });
    await proof.update({ consumedAt: new Date() }, { transaction });
    return requestView(row);
  });
}

export async function getCancellation(userId, requestId) {
  if (!isUuid(requestId)) reject(404, "CANCELLATION_NOT_FOUND", "Solicitud no encontrada.");
  const row = await AccountCancellationRequest.findOne({ where: { id: requestId, userId } });
  if (!row) reject(404, "CANCELLATION_NOT_FOUND", "Solicitud no encontrada.");
  return requestView(row);
}
