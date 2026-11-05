import express from "express";
import {
  getMyProfileDashboard,
  upsertMyProfile,
  getMyWeightHistory,
  createWeeklyWeightRecord,
  updateWeightRecord,
  deleteLatestWeightRecord,
  getMyCalorieHistory,
  createDailyCalorieRecord,
} from "../controllers/profileController.js";
import { requirePrivacySession as requireAuth, privateResponse } from "../middleware/privacySecurity.js";

const router = express.Router();
router.use(privateResponse);

router.get("/me", requireAuth, getMyProfileDashboard);
router.put("/me", requireAuth, upsertMyProfile);

router.get("/me/weights", requireAuth, getMyWeightHistory);
router.post("/me/weights", requireAuth, createWeeklyWeightRecord);
router.put("/me/weights/:id", requireAuth, updateWeightRecord);
router.delete("/me/weights/:id", requireAuth, deleteLatestWeightRecord);

router.get("/me/calories", requireAuth, getMyCalorieHistory);
router.post("/me/calories", requireAuth, createDailyCalorieRecord);

export default router;
