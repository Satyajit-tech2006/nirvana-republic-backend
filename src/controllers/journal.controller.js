import { Journal } from "../models/journal.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get published articles with category filtering & pagination
// @route   GET /api/v1/journal
// @access  Public
export const getArticles = asyncHandler(async (req, res) => {
  const { category, tag, page = 1, limit = 9 } = req.query;

  const query = { isPublished: true };

  if (category && category !== "all") {
    query.category = category;
  }

  if (tag) {
    query.tags = { $in: [tag] };
  }

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [articles, totalArticles] = await Promise.all([
    Journal.find(query)
      .select("-content")
      .sort({ publishedAt: -1, createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Journal.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        articles,
        pagination: {
          totalArticles,
          totalPages: Math.ceil(totalArticles / limitNum),
          currentPage: pageNum,
        },
      },
      "Journal articles fetched successfully"
    )
  );
});

// @desc    Get single article by slug with related products
// @route   GET /api/v1/journal/slug/:slug
// @access  Public
export const getArticleBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const article = await Journal.findOne({
    slug: slug.toLowerCase(),
    isPublished: true,
  }).populate("relatedProducts", "name slug price thumbnail tagline weightGrams");

  if (!article) {
    throw new ApiError(404, "Article not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, article, "Article fetched successfully"));
});

// @desc    Create a new article
// @route   POST /api/v1/journal
// @access  Private/Admin
export const createArticle = asyncHandler(async (req, res) => {
  const {
    title,
    slug,
    excerpt,
    content,
    category,
    coverImage,
    author,
    readTimeMinutes,
    relatedProducts,
    tags,
    isPublished,
  } = req.body;

  if (!title || !slug || !excerpt || !content || !coverImage) {
    throw new ApiError(400, "Title, slug, excerpt, content, and cover image are required");
  }

  const existingArticle = await Journal.findOne({ slug: slug.toLowerCase() });
  if (existingArticle) {
    throw new ApiError(409, "An article with this slug already exists");
  }

  const article = await Journal.create({
    title,
    slug: slug.toLowerCase(),
    excerpt,
    content,
    category: category || "Rituals",
    coverImage,
    author: author || { name: "Nirvana Editorial" },
    readTimeMinutes: readTimeMinutes || 4,
    relatedProducts: relatedProducts || [],
    tags: tags || [],
    isPublished: isPublished ?? false,
    publishedAt: isPublished ? new Date() : null,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, article, "Article created successfully"));
});

// @desc    Update an article
// @route   PATCH /api/v1/journal/:id
// @access  Private/Admin
export const updateArticle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const article = await Journal.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!article) {
    throw new ApiError(404, "Article not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, article, "Article updated successfully"));
});

// @desc    Delete an article
// @route   DELETE /api/v1/journal/:id
// @access  Private/Admin
export const deleteArticle = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const article = await Journal.findByIdAndDelete(id);
  if (!article) {
    throw new ApiError(404, "Article not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Article deleted successfully"));
});