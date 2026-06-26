import { Router } from "express";
import { verifyToken, authorizeRole } from "../../middleware/authMiddleware.js";
import { checkBlacklist } from "../../middleware/checkBlacklist.js";

import {
  listAdminRoutinesForReview,
  approveAdminRoutine,
  rejectAdminRoutine,
  archiveAdminRoutine,
} from "../../controllers/trainerRoutineController.js";

const router = Router();

router.use(verifyToken, checkBlacklist, authorizeRole("administrador"));

router.get("/", listAdminRoutinesForReview);

router.patch("/:id/approve", approveAdminRoutine);

router.patch("/:id/reject", rejectAdminRoutine);

router.patch("/:id/archive", archiveAdminRoutine);

export default router;