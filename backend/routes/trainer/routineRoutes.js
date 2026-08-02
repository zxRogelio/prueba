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
  uploadTrainerExerciseVideo,
  setTrainerExerciseVideoUrl,
  deleteTrainerExerciseVideo,
} from "../../controllers/trainerRoutineController.js";

const router = Router();

router.use(verifyToken, checkBlacklist, authorizeRole("entrenador"));

router.get("/", listTrainerRoutines);

router.get("/:id", getTrainerRoutineById);

router.post(
  "/",
  upload.fields([
    { name: "image", maxCount: 1 },
  ]),
  createTrainerRoutine
);

router.put(
  "/:id",
  upload.fields([
    { name: "image", maxCount: 1 },
  ]),
  updateTrainerRoutine
);

router.post(
  "/:routineId/exercises/:exerciseId/video",
  upload.single("video"),
  uploadTrainerExerciseVideo
);

router.patch(
  "/:routineId/exercises/:exerciseId/video-url",
  setTrainerExerciseVideoUrl
);

router.delete(
  "/:routineId/exercises/:exerciseId/video",
  deleteTrainerExerciseVideo
);

router.delete("/:id", deleteTrainerRoutine);

router.patch("/:id/publish", publishTrainerRoutine);

router.patch("/:id/archive", archiveTrainerRoutine);

export default router;
