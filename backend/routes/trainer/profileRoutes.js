import { Router } from "express";
import { verifyToken, authorizeRole } from "../../middleware/authMiddleware.js";
import { checkBlacklist } from "../../middleware/checkBlacklist.js";
import { upload } from "../../middleware/uploadMemory.js";

import {
  getTrainerProfile,
  updateTrainerProfile,
} from "../../controllers/trainerProfileController.js";

const router = Router();

router.use(verifyToken, checkBlacklist, authorizeRole("entrenador"));

router.get("/", getTrainerProfile);
router.put("/", upload.single("photo"), updateTrainerProfile);

export default router;