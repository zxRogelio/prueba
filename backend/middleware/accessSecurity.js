import rateLimit from "express-rate-limit";
import { Session } from "../models/Session.js";

// requireAuth verifies JWT and reads the current user/role. Require a live,
// matching persisted session too, without logging driver errors or JWTs.
export async function requireAccessSession(req, res, next) {
  try {
    const session = await Session.findOne({ where: {
      token: req.headers.authorization.slice(7), userId: req.user.id, revoked: false,
    } });
    const expiresAt = session?.expiresAt ? new Date(session.expiresAt).getTime() : NaN;
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return res.status(401).json({ ok: false, code: "UNAUTHORIZED", error: "Sesión expirada o revocada." });
    }
    return next();
  } catch {
    return res.status(503).json({ ok: false, accessGranted: false, code: "ACCESS_SERVICE_UNAVAILABLE", error: "No se pudo verificar la sesión. Intenta nuevamente más tarde." });
  }
}

function limiter(limit, keyGenerator) {
  return rateLimit({
    windowMs: 60000, limit, standardHeaders: true, legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    message: { ok: false, accessGranted: false, code: "ACCESS_RATE_LIMITED", error: "Demasiadas solicitudes. Espera antes de intentar nuevamente." },
  });
}

// IP limit runs before DB-backed authentication; user limits cannot be evaded
// by rotating IPs or signing in again. Default IPv6 handling comes from the lib.
export const accessIpLimiter = limiter(180);
export const qrGenerationLimiter = limiter(6, (req) => req.user.id);
export const qrScanLimiter = limiter(120, (req) => req.user.id);
export const accessHistoryLimiter = limiter(60, (req) => req.user.id);
