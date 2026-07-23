import { Router } from "express";
import { recordProductView } from "../controllers/behaviorEventController.js";
import { optionalAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/product-view", optionalAuth, recordProductView);

export default router;
