import { Router } from "express";
import {
  exportAdminPaymentsCsvController,
  getAdminPaymentDetailController,
  getAdminPaymentsChartController,
  getAdminPaymentsSummaryController,
  getPaymentStatus,
  listAdminChargebacks,
  listAdminPayments,
  listAdminRefundsController,
  listMyPayments,
  refundPayment,
} from "../controllers/paymentController.js";
import { verifyToken, authorizeRole } from "../middleware/authMiddleware.js";
import { checkBlacklist } from "../middleware/checkBlacklist.js";

const router = Router();

router.get(
  "/admin/payments/summary",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  getAdminPaymentsSummaryController
);

router.get(
  "/admin/payments/chart",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  getAdminPaymentsChartController
);

router.get(
  "/admin/payments/export",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  exportAdminPaymentsCsvController
);

router.get(
  "/admin/payments",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  listAdminPayments
);

router.get(
  "/admin/payments/chargebacks",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  listAdminChargebacks
);

router.post(
  "/admin/payments/:paymentId/refund",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  refundPayment
);

router.get(
  "/admin/payments/:paymentId",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  getAdminPaymentDetailController
);

router.get(
  "/admin/refunds",
  verifyToken,
  checkBlacklist,
  authorizeRole("administrador"),
  listAdminRefundsController
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
