import { Router } from "express";
import { requireAuth, authorizeRole } from "../middleware/authMiddleware.js";
import { checkBlacklist } from "../middleware/checkBlacklist.js";
import { accessIpLimiter, requireAccessSession, qrGenerationLimiter, qrScanLimiter, accessHistoryLimiter } from "../middleware/accessSecurity.js";
import { createQr, scanQr, myHistory, adminHistory } from "../controllers/accessController.js";

const router = Router();
router.use((req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
router.use(accessIpLimiter, requireAuth, checkBlacklist, requireAccessSession);
router.post("/qr", authorizeRole("cliente"), qrGenerationLimiter, createQr);
router.post("/scan", authorizeRole("administrador"), qrScanLimiter, scanQr);
router.get("/me/history", authorizeRole("cliente"), accessHistoryLimiter, myHistory);
router.get("/admin/history", authorizeRole("administrador"), accessHistoryLimiter, adminHistory);
export default router;
