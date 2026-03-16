import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/authMiddleware.js";
import { getPostgresMonitoring } from "../../controllers/adminMonitoringController.js";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/postgres", getPostgresMonitoring);

export default router;