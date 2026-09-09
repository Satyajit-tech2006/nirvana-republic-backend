import { Router } from "express";
import {
  getAllProducts,
  getProductBySlug,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/product.controller.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Product Discovery Routes
router.route("/").get(getAllProducts);
router.route("/featured").get(getFeaturedProducts);
router.route("/slug/:slug").get(getProductBySlug);

// Admin Product Management Routes
router.route("/").post(verifyJWT, verifyAdmin, createProduct);
router
  .route("/:id")
  .patch(verifyJWT, verifyAdmin, updateProduct)
  .delete(verifyJWT, verifyAdmin, deleteProduct);

export default router;