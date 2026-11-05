import express from "express";
import { verifyToken, authorizeRole } from "../middleware/authMiddleware.js";
import { updateAuthMethod } from "../controllers/userController.js";
import userPrivacyRoutes from "./userPrivacyRoutes.js";
import { checkBlacklist } from "../middleware/checkBlacklist.js";
import { changePassword } from "../controllers/authController.js";

const router = express.Router();

router.use(userPrivacyRoutes);

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
