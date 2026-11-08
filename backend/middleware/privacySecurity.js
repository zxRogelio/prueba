import jwt from "jsonwebtoken";
import rateLimit from "express-rate-limit";
import { User } from "../models/User.js";
import { Session } from "../models/Session.js";
import { isTokenBlacklisted } from "./tokenBlacklist.js";

export function privateResponse(req, res, next) {
  res.set("Cache-Control", "no-store");
  return next();
}

// express.json() errors can contain fragments of the submitted JSON. Handle
// them before Express's default error logger can print credentials or PII.
export function redactJsonErrors(error, req, res, next) {
  if (error.type === "entity.parse.failed" || error.type === "entity.too.large") {
    res.set("Cache-Control", "no-store");
    return res.status(error.type === "entity.too.large" ? 413 : 400).json({
      code: "INVALID_JSON", error: "El cuerpo JSON es inválido o supera el tamaño permitido.",
    });
  }
  return next(error);
}

export async function requirePrivacySession(req, res, next) {
  const header = req.headers.authorization;
  if (typeof header !== "string" || !/^Bearer \S+$/.test(header)) {
    return res.status(401).json({ code: "UNAUTHORIZED", error: "Se requiere una sesión vigente." });
  }
  const token = header.slice(7);
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ["HS256"] });
    if (!decoded.id || isTokenBlacklisted(token)) throw new Error();
  } catch {
    return res.status(401).json({ code: "UNAUTHORIZED", error: "Sesión inválida o expirada." });
  }
  try {
    const session = await Session.findOne({ where: { token, userId: decoded.id, revoked: false } });
    const expires = session?.expiresAt ? new Date(session.expiresAt).getTime() : NaN;
    if (!Number.isFinite(expires) || expires <= Date.now()) {
      return res.status(401).json({ code: "UNAUTHORIZED", error: "Sesión inválida o expirada." });
    }
    const user = await User.findByPk(decoded.id);
    if (!user || user.deletionCompletedAt) return res.status(401).json({ code: "UNAUTHORIZED", error: "Usuario no disponible." });
    req.user = user;
    req.authSession = session;
    req.loginMethod = decoded.loginMethod || "local";
    return next();
  } catch {
    return res.status(503).json({ code: "PRIVACY_SERVICE_UNAVAILABLE", error: "No se pudo verificar la sesión." });
  }
}

const limiter = (limit, windowMs, keyGenerator) => rateLimit({ limit, windowMs,
  standardHeaders: true, legacyHeaders: false, ...(keyGenerator ? { keyGenerator } : {}),
  message: { code: "PRIVACY_RATE_LIMITED", error: "Demasiados intentos. Espera antes de volver a intentar." },
});
export const privacyIpLimiter = limiter(180, 60000);
export const reauthenticationLimiter = limiter(10, 15 * 60000, (req) => req.user.id);
