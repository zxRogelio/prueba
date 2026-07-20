import { Router } from "express";
import {
  createMercadoPagoCheckoutPreference,
  receiveMercadoPagoWebhook,
} from "../controllers/checkoutController.js";
import { verifyToken, authorizeRole } from "../middleware/authMiddleware.js";
import { checkBlacklist } from "../middleware/checkBlacklist.js";

const router = Router();

router.post(
  "/checkout/mercadopago",
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente", "administrador"),
  createMercadoPagoCheckoutPreference
);

router.post("/webhooks/mercadopago", receiveMercadoPagoWebhook);

export default router;
