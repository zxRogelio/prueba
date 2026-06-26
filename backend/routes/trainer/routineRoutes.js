import { Router } from "express";
import { verifyToken, authorizeRole } from "../../middleware/authMiddleware.js";
import { checkBlacklist } from "../../middleware/checkBlacklist.js";
import { upload } from "../../middleware/uploadMemory.js";

import {
  listTrainerRoutines,
  getTrainerRoutineById,
  createTrainerRoutine,
  updateTrainerRoutine,
  deleteTrainerRoutine,
  publishTrainerRoutine,
  archiveTrainerRoutine,
} from "../../controllers/trainerRoutineController.js";

const router = Router();

router.use(verifyToken, checkBlacklist, authorizeRole("entrenador"));

router.get("/", listTrainerRoutines);

router.get("/:id", getTrainerRoutineById);

router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  createTrainerRoutine
);

router.put(
  "/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
    { name: "video", maxCount: 1 },
  ]),
  updateTrainerRoutine
);

router.delete("/:id", deleteTrainerRoutine);

router.patch("/:id/publish", publishTrainerRoutine);

router.patch("/:id/archive", archiveTrainerRoutine);

export default router;