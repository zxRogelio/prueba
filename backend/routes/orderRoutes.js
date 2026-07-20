import { Router } from "express";
import {
  cancelOrder,
  createAdminOrder,
  getOrderById,
  getOrderPaymentStatus,
  listAdminOrders,
  listMyOrders,
} from "../controllers/orderController.js";
import { verifyToken, authorizeRole } from "../middleware/authMiddleware.js";
import { checkBlacklist } from "../middleware/checkBlacklist.js";

const router = Router();

router.post(
  "/admin/orders",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  createAdminOrder
);

router.get(
  "/admin/orders",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  listAdminOrders
);

router.get(
  "/orders/me",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente", "administrador"),
  listMyOrders
);

router.get(
  "/orders/:orderId/payment-status",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente", "administrador"),
  getOrderPaymentStatus
);

router.get(
  "/orders/:orderId",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente", "administrador"),
  getOrderById
);

router.post(
  "/orders/:orderId/cancel",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente", "administrador"),
  cancelOrder
);

export default router;
