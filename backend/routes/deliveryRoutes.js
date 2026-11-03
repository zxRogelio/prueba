import { Router } from "express";
import { verifyToken, authorizeRole } from "../middleware/authMiddleware.js";
import { checkBlacklist } from "../middleware/checkBlacklist.js";
import { deliveryOptions, productQuote, listAddresses, saveAddress, deleteAddress,
  changeFulfillment, listShippingRates, saveShippingRate, readPickupSettings, updatePickupSettings } from "../controllers/deliveryController.js";

const router = Router();
const client = [verifyToken, checkBlacklist, authorizeRole("cliente")];
const checkout = [verifyToken, checkBlacklist, authorizeRole("cliente", "administrador")];
const admin = [verifyToken, checkBlacklist, authorizeRole("administrador")];
router.get("/delivery/options", ...checkout, deliveryOptions);
router.get("/admin/pickup-settings", ...admin, readPickupSettings);
router.put("/admin/pickup-settings", ...admin, updatePickupSettings);
router.post("/checkout/product-quote", ...checkout, productQuote);
router.get("/addresses/me", ...client, listAddresses);
router.post("/addresses/me", ...client, saveAddress);
router.put("/addresses/me/:addressId", ...client, saveAddress);
router.delete("/addresses/me/:addressId", ...client, deleteAddress);
router.patch("/admin/orders/:orderId/fulfillment", ...admin, changeFulfillment);
router.get("/admin/shipping-rates", ...admin, listShippingRates);
router.post("/admin/shipping-rates", ...admin, saveShippingRate);
router.patch("/admin/shipping-rates/:rateId", ...admin, saveShippingRate);
export default router;
