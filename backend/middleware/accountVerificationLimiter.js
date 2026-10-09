import rateLimit from "express-rate-limit";

const options = {
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: {
    error: "Demasiadas solicitudes de verificación. Intenta nuevamente más tarde.",
  },
  standardHeaders: true,
  legacyHeaders: false,
};

export const accountVerificationLimiter = rateLimit(options);
export const resendVerificationLimiter = rateLimit(options);
