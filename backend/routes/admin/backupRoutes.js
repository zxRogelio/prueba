import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/authMiddleware.js";
import {
  createBackup,
  downloadBackup,
  getBackupLogContent,
  getBackupOptions,
  listBackups,
} from "../../controllers/adminBackupController.js";

const router = Router();

router.use(requireAuth, requireAdmin);
router.get("/options", getBackupOptions);
router.get("/", listBackups);
router.get("/logs/:filename", getBackupLogContent);
router.post("/", createBackup);
router.get("/download/:filename", downloadBackup);

export default router;
