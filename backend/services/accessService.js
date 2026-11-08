import { createHash, randomBytes } from "node:crypto";
import { Op, Transaction } from "sequelize";
import { sequelize } from "../config/sequelize.js";
import { AccessQrToken, GymAccessLog, User, UserSubscription } from "../models/index.js";
import { subscriptionDateOnly } from "../utils/subscriptionDates.js";

export const ACCESS_QR_TTL_SECONDS = 60;
const historyAttributes = ["id", "userId", "subscriptionId", "scannedBy", "scannedAt", "result"];

export class AccessError extends Error {
  constructor(code, message, statusCode) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
  }
}

const membershipRequired = () => new AccessError("MEMBERSHIP_REQUIRED", "Necesitas una membresía activa y vigente para ingresar.", 403);
const hashToken = (token) => createHash("sha256").update(token).digest("hex");

function assertUsableToken(qr, now) {
  if (!qr) throw new AccessError("QR_INVALID", "Código QR inválido.", 400);
  if (qr.usedAt) throw new AccessError("QR_ALREADY_USED", "Este código QR ya fue utilizado. Genera uno nuevo.", 409);
  if (new Date(qr.expiresAt).getTime() <= now.getTime()) {
    throw new AccessError("QR_EXPIRED", "El código QR expiró. Genera uno nuevo.", 410);
  }
}

export async function generateAccessQr({ userId }) {
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
    // Follow activation's user-before-subscription lock order, including the
    // user FK lock acquired when inserting a QR. Also freeze the owner's role.
    const owner = await User.findByPk(userId, {
      attributes: ["id", "role", "deletionCompletedAt"], transaction, lock: transaction.LOCK.SHARE,
    });
    if (!owner || owner.deletionCompletedAt || owner.role !== "cliente") {
      throw new AccessError("QR_OWNER_INVALID", "La cuenta asociada no puede ingresar como cliente.", 403);
    }
    const today = subscriptionDateOnly(new Date());
    // Same inclusive UTC window as GET /memberships/me/subscription. Activated
    // groups and approved manual payments already have individual rows here.
    const subscription = await UserSubscription.findOne({
      where: { userId, status: "active", startsAt: { [Op.lte]: today }, endsAt: { [Op.gte]: today } },
      order: [["endsAt", "DESC"], ["id", "ASC"]],
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    const now = new Date();
    if (!subscription || subscription.status !== "active" || subscription.cancelledAt ||
        subscription.startsAt > subscriptionDateOnly(now) || subscription.endsAt < subscriptionDateOnly(now)) {
      throw membershipRequired();
    }
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date(now.getTime() + ACCESS_QR_TTL_SECONDS * 1000);
    await AccessQrToken.create({
      userId, subscriptionId: subscription.id, tokenHash: hashToken(token), expiresAt, createdAt: now,
    }, { transaction });
    return { ok: true, token, expiresAt, subscription: { status: subscription.status, endsAt: subscription.endsAt } };
  });
}

export async function scanAccessQr({ token, scannedBy }) {
  // Bounded opaque token only: never accept a JWT, URL, or arbitrary payload.
  if (typeof token !== "string" || !/^[A-Za-z0-9_-]{43}$/.test(token)) {
    throw new AccessError("QR_INVALID", "Código QR inválido.", 400);
  }
  return sequelize.transaction({ isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED }, async (transaction) => {
    const qr = await AccessQrToken.findOne({
      where: { tokenHash: hashToken(token) }, transaction, lock: transaction.LOCK.UPDATE,
    });
    // A concurrent scan waits here, then sees usedAt from the committed row.
    assertUsableToken(qr, new Date());
    if (qr.userId === scannedBy) throw new AccessError("SELF_SCAN_FORBIDDEN", "No puedes autorizar tu propio acceso.", 403);

    const owner = await User.findByPk(qr.userId, {
      attributes: ["id", "role", "deletionCompletedAt"], transaction, lock: transaction.LOCK.SHARE,
    });
    if (!owner || owner.deletionCompletedAt || owner.role !== "cliente") {
      throw new AccessError("QR_OWNER_INVALID", "La cuenta asociada no puede ingresar como cliente.", 403);
    }
    // Lock the exact subscription used at generation so cancellation/refund
    // cannot race the final check. Never substitute a different subscription.
    const subscription = await UserSubscription.findOne({
      where: { id: qr.subscriptionId, userId: qr.userId }, transaction, lock: transaction.LOCK.UPDATE,
    });
    const scannedAt = new Date(); // Recheck after ALL potentially blocking locks.
    assertUsableToken(qr, scannedAt);
    const today = subscriptionDateOnly(scannedAt);
    if (!subscription || subscription.status !== "active" || subscription.cancelledAt ||
        subscription.startsAt > today || subscription.endsAt < today) {
      throw membershipRequired();
    }
    const log = await GymAccessLog.create({
      qrTokenId: qr.id, userId: qr.userId, subscriptionId: subscription.id, scannedBy, scannedAt, result: "granted",
    }, { transaction });
    await qr.update({ usedAt: scannedAt }, { transaction });
    return {
      ok: true, accessGranted: true, message: "Acceso permitido",
      access: { id: log.id, userId: qr.userId, scannedAt, subscriptionStatus: subscription.status },
    };
  });
}

function positiveInteger(value, fallback, max) {
  if (value === undefined) return fallback;
  if (typeof value !== "string" || !/^[1-9]\d{0,8}$/.test(value) || Number(value) > max) {
    throw new AccessError("INVALID_HISTORY_FILTER", "Paginación inválida. Usa page positivo y limit entre 1 y 100.", 400);
  }
  return Number(value);
}

function dateFilter(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new AccessError("INVALID_HISTORY_FILTER", "Las fechas deben usar YYYY-MM-DD y ser válidas.", 400);
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || subscriptionDateOnly(date) !== value) {
    throw new AccessError("INVALID_HISTORY_FILTER", "Las fechas deben usar YYYY-MM-DD y ser válidas.", 400);
  }
  return date;
}

export async function listAccessHistory({ userId = null, query = {} }) {
  const page = positiveInteger(query.page, 1, 1000000);
  const limit = positiveInteger(query.limit, 20, 100);
  const where = userId ? { userId } : {};
  const from = query.from === undefined ? null : dateFilter(query.from);
  const to = query.to === undefined ? null : dateFilter(query.to);
  if (from && to && from > to) throw new AccessError("INVALID_HISTORY_FILTER", "from debe ser anterior o igual a to.", 400);
  if (from || to) {
    where.scannedAt = {};
    if (from) where.scannedAt[Op.gte] = from;
    if (to) where.scannedAt[Op.lt] = new Date(to.getTime() + 86400000);
  }
  const { rows, count } = await GymAccessLog.findAndCountAll({
    attributes: historyAttributes, where, order: [["scannedAt", "DESC"], ["id", "DESC"]],
    limit, offset: (page - 1) * limit,
  });
  // Explicit output projection remains safe even if model scopes change later.
  const history = rows.map((row) => Object.fromEntries(historyAttributes.map((key) => [key, row[key]])));
  return { ok: true, history, pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) } };
}
