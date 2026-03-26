import express from "express";
import {
  getMyProfileDashboard,
  upsertMyProfile,
  getMyWeightHistory,
  createWeeklyWeightRecord,
  deleteLatestWeightRecord,
  getMyCalorieHistory,
  createWeeklyCalorieRecord,
} from "../controllers/profileController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/me", requireAuth, getMyProfileDashboard);
router.put("/me", requireAuth, upsertMyProfile);

router.get("/me/weights", requireAuth, getMyWeightHistory);
router.post("/me/weights", requireAuth, createWeeklyWeightRecord);
router.delete("/me/weights/:id", requireAuth, deleteLatestWeightRecord);

router.get("/me/calories", requireAuth, getMyCalorieHistory);
router.post("/me/calories", requireAuth, createWeeklyCalorieRecord);

export default router;