export const forceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV !== "production" || req.secure) return next();

  // req.secure usa TLS directo o el proxy autorizado por Express.
  // El destino no se construye con Host/X-Forwarded-Host del cliente.
  let publicUrl;
  try {
    publicUrl = new URL(process.env.BACKEND_PUBLIC_URL);
  } catch {
    return res.status(400).send("HTTPS required.");
  }
  const path = req.originalUrl || req.url;
  if (publicUrl.protocol !== "https:" || publicUrl.username || publicUrl.password ||
      typeof path !== "string" || !path.startsWith("/") || /[\r\n]/.test(path)) {
    return res.status(400).send("HTTPS required.");
  }
  // 307 conserva método y cuerpo de autenticación y webhooks.
  return res.redirect(307, publicUrl.origin + path);
};
