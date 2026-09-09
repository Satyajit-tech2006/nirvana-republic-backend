import fs from "fs";
import { Journal } from "../models/journal.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// @desc    Get published articles with category filtering & pagination
// @route   GET /api/v1/journal
// @access  Public
export const getArticles = asyncHandler(async (req, res) => {
  const { category, tag, page = 1, limit = 9 } = req.query;

  const query = { isPublished: true };

  if (category && category !== "all" && category !== "All") {
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
    readTimeMinutes,
    isPublished,
  } = req.body;

  // Cleanup helper in case of validation error
  const localFilePath = req.file?.path;

  if (!title || !slug || !excerpt || !content) {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    throw new ApiError(400, "Title, slug, excerpt, and content body are required");
  }

  const existingArticle = await Journal.findOne({ slug: slug.toLowerCase() });
  if (existingArticle) {
    if (localFilePath && fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    throw new ApiError(409, "An article with this slug already exists");
  }

  // Handle Cover Image Upload to Cloudinary
  let coverImageUrl = req.body.coverImage;
  if (localFilePath) {
    const uploaded = await uploadOnCloudinary(localFilePath);
    coverImageUrl = uploaded?.secure_url || uploaded?.url;
  }

  if (!coverImageUrl) {
    throw new ApiError(400, "Cover image is required");
  }

  // Parse complex JSON/string fields safely
  let author = { name: "Nirvana Editorial", role: "Botanical Research Lead" };
  if (req.body.author) {
    try {
      author = typeof req.body.author === "string" ? JSON.parse(req.body.author) : req.body.author;
    } catch {
      author = { name: req.body.author, role: "Botanical Research Lead" };
    }
  }

  let tags = [];
  if (req.body.tags) {
    try {
      tags = typeof req.body.tags === "string" ? JSON.parse(req.body.tags) : req.body.tags;
    } catch {
      tags = req.body.tags.split(",").map((t) => t.trim());
    }
  }

  let relatedProducts = [];
  if (req.body.relatedProducts) {
    try {
      relatedProducts = typeof req.body.relatedProducts === "string" ? JSON.parse(req.body.relatedProducts) : req.body.relatedProducts;
    } catch {
      relatedProducts = [];
    }
  }

  const shouldPublish = isPublished === "true" || isPublished === true;

  const article = await Journal.create({
    title: title.trim(),
    slug: slug.toLowerCase().trim(),
    excerpt: excerpt.trim(),
    content,
    category: category || "Rituals",
    coverImage: coverImageUrl,
    author,
    readTimeMinutes: Number(readTimeMinutes) || 4,
    relatedProducts,
    tags,
    isPublished: shouldPublish,
    publishedAt: shouldPublish ? new Date() : null,
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

  let updateData = { ...req.body };

  // Handle updated image if uploaded
  if (req.file?.path) {
    const uploaded = await uploadOnCloudinary(req.file.path);
    if (uploaded?.secure_url || uploaded?.url) {
      updateData.coverImage = uploaded.secure_url || uploaded.url;
    }
  }

  if (updateData.author && typeof updateData.author === "string") {
    try {
      updateData.author = JSON.parse(updateData.author);
    } catch {
      // Keep as is
    }
  }

  if (updateData.tags && typeof updateData.tags === "string") {
    try {
      updateData.tags = JSON.parse(updateData.tags);
    } catch {
      updateData.tags = updateData.tags.split(",").map((t) => t.trim());
    }
  }

  const article = await Journal.findByIdAndUpdate(
    id,
    { $set: updateData },
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