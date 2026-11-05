import { Router } from "express";
import { getNotice } from "../controllers/privacyController.js";
import { privateResponse, privacyIpLimiter } from "../middleware/privacySecurity.js";

const router = Router();
router.get("/notice", privateResponse, privacyIpLimiter, getNotice);
export default router;
