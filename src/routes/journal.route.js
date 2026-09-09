import { Router } from "express";
import {
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
} from "../controllers/journal.controller.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Editorial Discovery
router.route("/").get(getArticles);
router.route("/slug/:slug").get(getArticleBySlug);

// Admin Content Management
router.route("/").post(verifyJWT, verifyAdmin, createArticle);
router
  .route("/:id")
  .patch(verifyJWT, verifyAdmin, updateArticle)
  .delete(verifyJWT, verifyAdmin, deleteArticle);

export default router;