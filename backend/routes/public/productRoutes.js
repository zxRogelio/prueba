import { Router } from "express";
import {
  getPublicCartProductRecommendations,
  getPublicProductById,
  getPublicProductRecommendations,
  listPublicProducts,
} from "../../controllers/productController.js";

const router = Router();

router.get("/", listPublicProducts);
router.post("/recommendations", getPublicCartProductRecommendations);
router.get("/:id/recommendations", getPublicProductRecommendations);
router.get("/:id", getPublicProductById);

export default router;
