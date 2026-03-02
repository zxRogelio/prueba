// middleware/authMiddleware.js
import jwt from "jsonwebtoken";
import { Session } from "../models/Session.js";
import { User } from "../models/User.js";

// ✅ Verifica JWT + Session (para logout / blacklist / cosas de sesión)
export const verifyToken = async (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ error: "Token no proporcionado" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.loginMethod = decoded.loginMethod || "local";

    const session = await Session.findOne({
      where: { token, revoked: false },
    });

    if (!session) {
      return res.status(401).json({ error: "Token revocado o inválido" });
    }

    const now = new Date();
    if (session.expiresAt < now) {
      return res.status(401).json({ error: "Sesión expirada" });
    }

    const user = await User.findByPk(decoded.id);
    if (!user) {
      return res.status(401).json({ error: "Usuario no encontrado" });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error("❌ Error al verificar token:", err);
    return res.status(403).json({ error: "Token inválido" });
  }
};

// ✅ Solo JWT (sin Session) — ideal para rutas admin CRUD
export const requireAuth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: "No autenticado" });

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findByPk(decoded.id);
    if (!user) return res.status(401).json({ error: "Usuario inválido" });

    req.user = { id: user.id, email: user.email, role: user.role };
    next();
  } catch (e) {
    return res.status(401).json({ error: "Token inválido" });
  }
};

// ✅ Autorización por rol
export const authorizeRole = (...roles) => {
  return (req, res, next) => {
    const role = req.user?.role || req.user?.rol;
    if (!role) return res.status(401).json({ error: "Usuario no autenticado" });

    if (!roles.includes(role)) {
      return res.status(403).json({ error: "No tienes permisos para acceder a este recurso" });
    }

    next();
  };
};

// ✅ Admin fijo
export const requireAdmin = (req, res, next) => {
  const role = req.user?.role || req.user?.rol;
  if (role !== "administrador") {
    return res.status(403).json({ error: "Acceso solo para administrador" });
  }
  next();
};

