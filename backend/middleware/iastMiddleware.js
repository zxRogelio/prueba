import crypto from "crypto";
import { iastInfo } from "../utils/iastLogger.js";

export const iastRequestContext = (req, res, next) => {
  const traceId = crypto.randomUUID();

  req.iast = {
    traceId,
    startedAt: Date.now(),
  };

  iastInfo("REQUEST_START", {
    traceId,
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.headers["user-agent"] || "unknown",
  });

  res.on("finish", () => {
    iastInfo("REQUEST_END", {
      traceId,
      method: req.method,
      path: req.originalUrl,
      statusCode: res.statusCode,
      durationMs: Date.now() - req.iast.startedAt,
      userId: req.user?.id || null,
      role: req.user?.role || null,
    });
  });

  next();
};