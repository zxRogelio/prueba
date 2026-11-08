import { Router } from "express";
import { getNotice, getCapabilities } from "../controllers/privacyController.js";
import { privateResponse, privacyIpLimiter } from "../middleware/privacySecurity.js";

const router = Router();
router.get('/capabilities', privateResponse, privacyIpLimiter, getCapabilities);
router.get("/notice", privateResponse, privacyIpLimiter, getNotice);
export default router;
