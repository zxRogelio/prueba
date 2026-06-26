import { Router } from "express";
import { verifyToken, authorizeRole } from "../../middleware/authMiddleware.js";
import { checkBlacklist } from "../../middleware/checkBlacklist.js";

import {
  listTrainerAgenda,
  createTrainerAgendaItem,
  updateTrainerAgendaItem,
  deleteTrainerAgendaItem,
} from "../../controllers/trainerAgendaController.js";

const router = Router();

router.use(verifyToken, checkBlacklist, authorizeRole("entrenador"));

router.get("/", listTrainerAgenda);
router.post("/", createTrainerAgendaItem);
router.put("/:id", updateTrainerAgendaItem);
router.delete("/:id", deleteTrainerAgendaItem);

export default router;