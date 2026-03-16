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
} from "../../controllers/productController.js";

import {
  exportProductsCsv,
  exportProductsImportTemplateCsv,
  uploadProductsCsv,
  validateProductsImport,
  previewProductsImport,
  getImportErrors,
  commitProductsImport,
} from "../../controllers/catalogImportExportController.js";

const router = Router();

router.use(requireAuth, requireAdmin);

router.get("/", listProducts);
router.post("/", upload.array("images", 8), createProduct);
router.put("/:id", upload.array("images", 8), updateProduct);
router.delete("/:id", deleteProduct);
router.delete("/:id/images/:imageId", deleteProductImage);
router.put("/:id/images/reorder", reorderProductImages);

router.get("/export/csv", exportProductsCsv);
router.get("/import/template/csv", exportProductsImportTemplateCsv);

router.post("/import/upload", upload.single("file"), uploadProductsCsv);
router.post("/import/:batchId/validate", validateProductsImport);
router.get("/import/:batchId/preview", previewProductsImport);
router.get("/import/:batchId/errors", getImportErrors);
router.post("/import/:batchId/commit", commitProductsImport);

export default router;