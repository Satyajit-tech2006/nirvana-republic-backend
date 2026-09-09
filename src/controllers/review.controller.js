import { Review } from "../models/review.model.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get all approved reviews for a product
// @route   GET /api/v1/reviews/product/:productId
// @access  Public
export const getProductReviews = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { page = 1, limit = 10 } = req.query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [reviews, totalReviews] = await Promise.all([
    Review.find({ product: productId, isApproved: true })
      .populate("user", "name avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Review.countDocuments({ product: productId, isApproved: true }),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reviews,
        pagination: {
          totalReviews,
          totalPages: Math.ceil(totalReviews / limitNum),
          currentPage: pageNum,
        },
      },
      "Product reviews fetched successfully"
    )
  );
});

// @desc    Add a product review
// @route   POST /api/v1/reviews
// @access  Private
export const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, title, comment, photos } = req.body;

  if (!productId || !rating || !title || !comment) {
    throw new ApiError(400, "Product ID, rating, title, and comment are required");
  }

  const product = await Product.findById(productId);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  // Prevent multiple reviews on the same product
  const existingReview = await Review.findOne({
    product: productId,
    user: req.user._id,
  });

  if (existingReview) {
    throw new ApiError(400, "You have already reviewed this product");
  }

  // Check verified purchase status from user's completed orders
  const verifiedOrder = await Order.findOne({
    user: req.user._id,
    "items.product": productId,
    paymentStatus: "paid",
  });

  const review = await Review.create({
    product: productId,
    user: req.user._id,
    rating: Number(rating),
    title,
    comment,
    photos: photos || [],
    isVerifiedPurchase: !!verifiedOrder,
    isApproved: true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, review, "Review submitted successfully"));
});

// @desc    Delete a review (Owner or Admin)
// @route   DELETE /api/v1/reviews/:reviewId
// @access  Private
export const deleteReview = asyncHandler(async (req, res) => {
  const { reviewId } = req.params;

  const review = await Review.findById(reviewId);
  if (!review) {
    throw new ApiError(404, "Review not found");
  }

  // Allow author or admin to delete
  if (
    review.user.toString() !== req.user._id.toString() &&
    req.user.role !== "admin"
  ) {
    throw new ApiError(403, "You are not authorized to delete this review");
  }

  await Review.findOneAndDelete({ _id: reviewId });

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Review deleted successfully"));
});