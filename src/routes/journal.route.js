import { Router } from "express";
import {
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
} from "../controllers/journal.controller.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public Editorial Discovery
router.route("/").get(getArticles);
router.route("/slug/:slug").get(getArticleBySlug);

// Admin Content Management - Note: Added upload.single("coverImage")
router
  .route("/")
  .post(verifyJWT, verifyAdmin, upload.single("coverImage"), createArticle);

router
  .route("/:id")
  .patch(verifyJWT, verifyAdmin, upload.single("coverImage"), updateArticle)
  .delete(verifyJWT, verifyAdmin, deleteArticle);

export default router;