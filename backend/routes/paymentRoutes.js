import { Router } from "express";
import {
  getPaymentStatus,
  listAdminPayments,
  listMyPayments,
  refundPayment,
} from "../controllers/paymentController.js";
import { verifyToken, authorizeRole } from "../middleware/authMiddleware.js";
import { checkBlacklist } from "../middleware/checkBlacklist.js";

const router = Router();

router.get(
  "/admin/payments",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  listAdminPayments
);

router.post(
  "/admin/payments/:paymentId/refund",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  refundPayment
);

router.get(
  "/payments/me",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente", "administrador"),
  listMyPayments
);

router.get(
  "/payments/:paymentId/status",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente", "administrador"),
  getPaymentStatus
);

export default router;
