import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product reference is required"],
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User reference is required"],
      index: true,
    },
    rating: {
      type: Number,
      required: [true, "Rating is required"],
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    title: {
      type: String,
      required: [true, "Review headline is required"],
      trim: true,
      maxlength: [120, "Headline cannot exceed 120 characters"],
    },
    comment: {
      type: String,
      required: [true, "Review body comment is required"],
      trim: true,
    },
    photos: {
      type: [String], // Array of Cloudinary image URLs
      default: [],
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: false,
    },
    isApproved: {
      type: Boolean,
      default: true, // Set to false if you want manual admin moderation
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Prevent multiple reviews per product from the same user
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Static method to recalculate product average rating & count
reviewSchema.statics.calculateAverageRating = async function (productId) {
  const stats = await this.aggregate([
    {
      $match: {
        product: new mongoose.Types.ObjectId(productId),
        isApproved: true,
      },
    },
    {
      $group: {
        _id: "$product",
        averageRating: { $avg: "$rating" },
        totalReviews: { $sum: 1 },
      },
    },
  ]);

  const Product = mongoose.model("Product");

  if (stats.length > 0) {
    await Product.findByIdAndUpdate(productId, {
      averageRating: Math.round(stats[0].averageRating * 10) / 10,
      totalReviews: stats[0].totalReviews,
    });
  } else {
    await Product.findByIdAndUpdate(productId, {
      averageRating: 5.0,
      totalReviews: 0,
    });
  }
};

// Recalculate average after new review save
reviewSchema.post("save", function () {
  this.constructor.calculateAverageRating(this.product);
});

// Recalculate average after review deletion/update
reviewSchema.post(
  "findOneAndDelete",
  async function (doc) {
    if (doc) {
      await doc.constructor.calculateAverageRating(doc.product);
    }
  }
);

export const Review = mongoose.model("Review", reviewSchema);