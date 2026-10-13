import { createHash } from "node:crypto";
import jwt from "jsonwebtoken";
import { sequelize } from "../config/sequelize.js";
import { Session, User } from "../models/index.js";

function reject(message, statusCode = 403) {
  throw Object.assign(new Error(message), { statusCode });
}

// Identifica el destino efectivo de Sequelize; nunca incluye password ni URL.
export function getReconciliationDatabaseId(config) {
  if (!config?.host || !config.database || !config.username) {
    reject("No se pudo identificar la base de reconciliacion.", 503);
  }
  return createHash("sha256").update(JSON.stringify({
    host: config.host.toLowerCase(), port: Number(config.port || 5432),
    database: config.database, username: config.username, schema: "core",
  })).digest("hex");
}

export function getReconciliationPolicy() {
  if (sequelize.options?.replication) {
    reject("La reconciliacion requiere una conexion sin replicas de lectura.", 503);
  }
  const sellerId = process.env.MERCADOPAGO_EXPECTED_SELLER_ID?.trim();
  const mode = process.env.MERCADOPAGO_EXPECTED_LIVE_MODE?.trim();
  const environment = process.env.MERCADOPAGO_RECONCILIATION_ENVIRONMENT?.trim();
  // La excepcion nunca se infiere de live_mode, del token ni de la rama Git.
  const paymentMode = process.env.MERCADOPAGO_RECONCILIATION_PAYMENT_MODE?.trim() ??
    (environment === "production" ? "production" : "sandbox");
  const expectedDatabaseId = process.env.MERCADOPAGO_RECONCILIATION_DATABASE_ID?.trim();
  if (!/^\d+$/.test(sellerId || "") || !["true", "false"].includes(mode) ||
      !["test", "production"].includes(environment) ||
      !/^[a-f0-9]{64}$/.test(expectedDatabaseId || "")) {
    reject("Falta configurar la politica confiable de reconciliacion.", 503);
  }
  const allowedModes = {
    sandbox: { environment: "test", liveMode: "false" },
    checkout_pro_test_account: { environment: "test", liveMode: "true" },
    production: { environment: "production", liveMode: "true" },
  };
  const allowed = Object.hasOwn(allowedModes, paymentMode) ? allowedModes[paymentMode] : null;
  if (!allowed || allowed.environment !== environment || allowed.liveMode !== mode) {
    reject("El entorno de reconciliacion y live_mode no coinciden.");
  }
  const databaseId = getReconciliationDatabaseId(sequelize.config);
  if (databaseId !== expectedDatabaseId) {
    reject("La base conectada no es el destino autorizado de reconciliacion.");
  }
  return { sellerId, liveMode: mode === "true", environment, databaseId, paymentMode };
}

// seller procede de /users/me autenticado con el mismo token que consulta el pago.
// live_mode describe el modo del recurso; no acredita que la cuenta sea comercial.
export function assertReconciliationProviderEnvironment({ policy, seller, providerPayment }) {
  if (!seller?.id || !providerPayment?.collector_id ||
      String(seller.id) !== policy.sellerId ||
      String(providerPayment.collector_id) !== policy.sellerId ||
      providerPayment.live_mode !== policy.liveMode) {
    reject("El vendedor o live_mode no corresponde al entorno autorizado.", 409);
  }
  const verifiedTags = Array.isArray(seller.tags) && seller.tags.length > 0 &&
    seller.tags.every((tag) => typeof tag === "string" && tag.length > 0);
  const testAccount = verifiedTags && seller.tags.includes("test_user");
  if (policy.paymentMode === "checkout_pro_test_account" && !testAccount) {
    reject("Checkout Pro de prueba requiere un vendedor acreditado como test_user por el proveedor.", 409);
  }
  if (policy.paymentMode === "production" && (!verifiedTags || testAccount)) {
    reject("Produccion requiere acreditar una cuenta vendedora que no sea test_user.", 409);
  }
}

export function assertReconciliationApproval({ approval, orderId, policy }) {
  if (approval?.orderId !== orderId || approval?.databaseId !== policy.databaseId) {
    reject("Aplicar requiere confirmar explicitamente la orden y la base autorizadas.");
  }
}

export async function authenticateReconciliationOperator({
  operatorToken, requestedBy = null, transaction = null,
}) {
  let decoded;
  try {
    if (typeof operatorToken !== "string" || !operatorToken.trim() || !process.env.JWT_SECRET) {
      reject("Se requiere una sesion administrativa vigente.", 401);
    }
    decoded = jwt.verify(operatorToken, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!decoded.id || !Number.isInteger(decoded.exp)) throw new Error("Invalid claims");
  } catch {
    reject("Sesion administrativa invalida o expirada.", 401);
  }
  const options = { transaction, ...(transaction ? { lock: transaction.LOCK.UPDATE } : {}) };
  const session = await Session.findOne({
    where: { token: operatorToken, userId: decoded.id, revoked: false }, ...options,
  });
  if (!session || !(new Date(session.expiresAt).getTime() > Date.now())) {
    reject("Sesion administrativa revocada o expirada.", 401);
  }
  const user = await User.findByPk(decoded.id, options);
  if (!user || user.role !== "administrador" || !user.isVerified || user.isPendingApproval || user.mustChangePassword) {
    reject("El operador no esta autorizado para reconciliar pagos.");
  }
  if (requestedBy != null && requestedBy !== user.id) {
    reject("El operador indicado no coincide con la sesion autenticada.");
  }
  return { id: user.id, sessionId: session.id };
}
