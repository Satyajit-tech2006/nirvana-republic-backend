import { Router } from "express";
import {
  getArticles,
  getArticleBySlug,
  createArticle,
  updateArticle,
  deleteArticle,
} from "../controllers/journal.controller.js";
import { verifyJWT, requirePermission } from "../middlewares/auth.middleware.js";
import { upload } from "../middlewares/multer.middleware.js";

const router = Router();

// Public Editorial Discovery
router.route("/").get(getArticles);
router.route("/slug/:slug").get(getArticleBySlug);

// Admin Content Management Protected by MANAGE_JOURNALS Capability
router
  .route("/")
  .post(
    verifyJWT,
    requirePermission("MANAGE_JOURNALS"),
    upload.single("coverImage"),
    createArticle
  );

router
  .route("/:id")
  .patch(
    verifyJWT,
    requirePermission("MANAGE_JOURNALS"),
    upload.single("coverImage"),
    updateArticle
  )
  .delete(
    verifyJWT,
    requirePermission("MANAGE_JOURNALS"),
    deleteArticle
  );

export default router;