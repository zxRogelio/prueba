export const forceHTTPS = (req, res, next) => {
  if (process.env.NODE_ENV !== "production") {
    return next();
  }

  const isHttps =
    req.secure || req.headers["x-forwarded-proto"] === "https";

  if (isHttps) {
    return next();
  }

  const baseUrl = process.env.APP_BASE_URL;

  if (!baseUrl) {
    return next();
  }

  try {
    const redirectUrl = new URL(req.originalUrl || "/", baseUrl).toString();
    return res.redirect(301, redirectUrl);
  } catch {
    return next();
  }
};
