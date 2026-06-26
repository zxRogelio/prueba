import { Router } from "express";
import { verifyToken, authorizeRole } from "../../middleware/authMiddleware.js";
import { checkBlacklist } from "../../middleware/checkBlacklist.js";
import { listTrainerClients } from "../../controllers/trainerClientController.js";

const router = Router();

router.use(verifyToken, checkBlacklist, authorizeRole("entrenador"));

router.get("/", listTrainerClients);

export default router;