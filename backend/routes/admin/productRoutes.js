import { Router } from "express";
import { requireAuth, requireAdmin } from "../../middleware/authMiddleware.js";
import { upload } from "../../middleware/uploadMemory.js";

import {
  listProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  deleteProductImage,
  reorderProductImages,
} from "../../controllers/productController.js"; // ✅ ESTA RUTA

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listProducts);

router.post("/", upload.array("images", 8), createProduct);
router.put("/:id", upload.array("images", 8), updateProduct);

router.delete("/:id", deleteProduct);
router.delete("/:id/images/:imageId", deleteProductImage);
router.put("/:id/images/reorder", reorderProductImages);

export default router;
