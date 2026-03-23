import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/authMiddleware.js";
import {
  getScheduleConfigs,
  createScheduleConfig,
  updateScheduleConfig,
  deleteScheduleConfig,
  runScheduledBackupNow,
} from "../../controllers/adminBackupScheduleController.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", getScheduleConfigs);
router.post("/", createScheduleConfig);
router.put("/:id", updateScheduleConfig);
router.delete("/:id", deleteScheduleConfig);
router.post("/:id/run-now", runScheduledBackupNow);

export default router;