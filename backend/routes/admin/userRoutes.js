import express from "express";
import { verifyToken, authorizeRole } from "../../middleware/authMiddleware.js";
import { adminRegisterTrainer } from "../../controllers/authController.js";
import { listAdminUsers } from "../../controllers/adminUserController.js";
import { checkBlacklist } from "../../middleware/checkBlacklist.js";

const router = express.Router();

router.get(
  "/",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  listAdminUsers,
);

// Solo administradores pueden registrar entrenadores
router.post(
  "/register-trainer",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  adminRegisterTrainer,
);

export default router;
