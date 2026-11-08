// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";

export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"] || req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    console.log("🔴 verifyToken: token no proporcionado");
    return res.status(401).json({ error: "Token no proporcionado" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 🧩 Guardamos el método de login en esta request (si viene)
    req.loginMethod = decoded.loginMethod || "local";

    // 🔍 Intentamos encontrar la sesión, pero ahora es OPCIONAL
    const session = await Session.findOne({ where: { token } });

    if (session) {
      const now = new Date();

      if (session.revoked) {
        console.log("🔴 verifyToken: sesión revocada en BD");
        return res
          .status(401)
          .json({ error: "Token revocado o inválido" });
      }

      if (session.expiresAt && session.expiresAt < now) {
        console.log("🔴 verifyToken: sesión expirada en BD");
        return res.status(401).json({ error: "Sesión expirada" });
      }
    } else {
      // ⚠️ Token válido pero sin fila en Session (ej: verificación por OTP/TOTP)
      console.log("⚠️ verifyToken: token sin fila en Session, se permite continuar.");
    }

    const user = await User.findByPk(decoded.id);

    if (!user || user.deletionCompletedAt) {
      console.log("🔴 verifyToken: usuario no encontrado para id:", decoded.id);
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    // ✅ Todo bien: adjuntamos usuario a la request
    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Error al verificar token:", err);
    return res.status(403).json({ error: "Token inválido" });
  }
};
