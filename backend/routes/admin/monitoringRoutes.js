import { Router } from "express";
import {
  getPostgresMonitoring,
  runVacuumAnalyze,
  runAnalyzeTable,
  runReindexTable,
} from "../../controllers/adminMonitoringController.js";
import {
  requireAuth,
  requireAdmin,
} from "../../middleware/authMiddleware.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/postgres", getPostgresMonitoring);

router.post("/maintenance/vacuum-analyze", runVacuumAnalyze);
router.post("/maintenance/analyze", runAnalyzeTable);
router.post("/maintenance/reindex", runReindexTable);

export default router;