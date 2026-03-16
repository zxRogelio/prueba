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

  return res.redirect(301, baseUrl);
};
