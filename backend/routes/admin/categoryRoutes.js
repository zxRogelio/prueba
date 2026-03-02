import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/authMiddleware.js";

import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../../controllers/categoryController.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listCategories);
router.post("/", createCategory);
router.put("/:id", updateCategory);
router.delete("/:id", deleteCategory);

export default router;
