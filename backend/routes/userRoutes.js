import express from "express";
import { verifyToken, authorizeRole } from "../middleware/authMiddleware.js";
import { updateAuthMethod } from "../controllers/userController.js";
import { User } from "../models/User.js";
import { checkBlacklist } from "../middleware/checkBlacklist.js";
import { changePassword } from "../controllers/authController.js";

const router = express.Router();

router.get("/profile", verifyToken, checkBlacklist, async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Usuario no autenticado" });
    }

    const user = req.user;
    const loginMethod =
      req.loginMethod || (user.provider === "google" ? "google" : "local");

    return res.json({
      id: user.id,
      email: user.email,
      rol: user.role,
      authMethod: user.authMethod,
      provider: user.provider,
      loginMethod,
    });
  } catch (err) {
    console.error("❌ Error al obtener perfil:", err);
    return res.status(500).json({ error: "Error del servidor" });
  }
});

router.patch(
  "/update-auth-method",
  verifyToken,
  checkBlacklist,
  updateAuthMethod
);

router.patch(
  "/change-password",
  verifyToken,
  checkBlacklist,
  changePassword
);
router.get("/perfil", verifyToken, checkBlacklist, (req, res) => {
  res.json({
    message: "Acceso al perfil del usuario",
    email: req.user.email,
    role: req.user.role,
  });
});

router.get(
  "/admin-dashboard",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  (req, res) => {
    res.json({ message: "Bienvenido al panel del administrador 🛡️" });
  }
);

router.get(
  "/entrenador-panel",
  verifyToken,
  checkBlacklist,
  authorizeRole("entrenador"),
  (req, res) => {
    res.json({ message: "Bienvenido al panel del entrenador 🏋️" });
  }
);

router.get(
  "/cliente-area",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente"),
  (req, res) => {
    res.json({ message: "Área exclusiva para clientes 🧘" });
  }
);

export default router;
