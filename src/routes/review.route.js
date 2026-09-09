import { Router } from "express";
import {
  getProductReviews,
  createReview,
  deleteReview,
} from "../controllers/review.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public review retrieval
router.route("/product/:productId").get(getProductReviews);

// Secured review actions
router.route("/").post(verifyJWT, createReview);
router.route("/:reviewId").delete(verifyJWT, deleteReview);

export default router;