import { Router } from "express";
import { verifyToken, authorizeRole } from "../../middleware/authMiddleware.js";
import { checkBlacklist } from "../../middleware/checkBlacklist.js";
import { requireActiveSubscription } from "../../middleware/requireActiveSubscription.js";

import {
  publicTrainerRoutine,
  getPublicTrainerRoutineById,
} from "../../controllers/trainerRoutineController.js";

const router = Router();

router.use(
  verifyToken,
  checkBlacklist,
  authorizeRole("cliente"),
  requireActiveSubscription
);

router.get("/", publicTrainerRoutine);

router.get("/:id", getPublicTrainerRoutineById);

export default router;