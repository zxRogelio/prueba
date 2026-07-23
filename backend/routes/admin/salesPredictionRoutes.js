import { Router } from "express";
import { getAdminSalesPredictions } from "../../controllers/admin/salesPredictionController.js";
import { requireAdmin, requireAuth } from "../../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", getAdminSalesPredictions);

export default router;
