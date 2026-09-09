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
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Define multer fields for images and lab report
const productUploads = upload.fields([
  { name: "images", maxCount: 6 },
  { name: "labReport", maxCount: 1 },
]);

// Public Discovery Routes
router.route("/").get(getAllProducts);
router.route("/featured").get(getFeaturedProducts);
router.route("/slug/:slug").get(getProductBySlug);

// Admin Management Routes with Multi-File Uploads
router.route("/").post(verifyJWT, verifyAdmin, productUploads, createProduct);
router
  .route("/:id")
  .patch(verifyJWT, verifyAdmin, productUploads, updateProduct)
  .delete(verifyJWT, verifyAdmin, deleteProduct);

export default router;