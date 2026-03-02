import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/authMiddleware.js";

import {
  listBrands,
  createBrand,
  updateBrand,
  deleteBrand,
} from "../../controllers/brandController.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listBrands);
router.post("/", createBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);

export default router;
