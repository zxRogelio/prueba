import { AccessError, generateAccessQr, scanAccessQr, listAccessHistory } from "../services/accessService.js";

function failure(res, error) {
  if (error instanceof AccessError) {
    return res.status(error.statusCode).json({ ok: false, accessGranted: false, code: error.code, error: error.message });
  }
  // Driver errors may include SQL, tokens or connection strings. Do not log them.
  return res.status(503).json({
    ok: false, accessGranted: false, code: "ACCESS_SERVICE_UNAVAILABLE",
    error: "No se pudo verificar el acceso. Intenta nuevamente más tarde.",
  });
}

export async function createQr(req, res) {
  try { return res.status(201).json(await generateAccessQr({ userId: req.user.id })); }
  catch (error) { return failure(res, error); }
}

export async function scanQr(req, res) {
  try { return res.json(await scanAccessQr({ token: req.body?.token, scannedBy: req.user.id })); }
  catch (error) { return failure(res, error); }
}

export async function myHistory(req, res) {
  try { return res.json(await listAccessHistory({ userId: req.user.id, query: req.query })); }
  catch (error) { return failure(res, error); }
}

export async function adminHistory(req, res) {
  try { return res.json(await listAccessHistory({ query: req.query })); }
  catch (error) { return failure(res, error); }
}
