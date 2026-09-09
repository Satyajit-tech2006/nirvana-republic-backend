import mongoose, { Schema } from "mongoose";

const nutritionalFactSchema = new Schema(
  {
    servingSize: {
      type: String,
      default: "100g",
    },
    energyKcal: {
      type: Number,
      required: true,
    },
    protein: {
      type: Number, // in grams
      required: true,
    },
    carbohydrates: {
      type: Number, // in grams
      required: true,
    },
    dietaryFiber: {
      type: Number, // in grams
      required: true,
    },
    fat: {
      type: Number, // in grams
      default: 0,
    },
  },
  { _id: false }
);

const productSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, "Product slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    tagline: {
      type: String,
      required: [true, "Product tagline is required"],
      trim: true,
    },
    description: {
      type: String,
      required: [true, "Product description is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: {
        values: ["powders", "seeds", "superfoods", "pantry"],
        message: "{VALUE} is not a supported category",
      },
      index: true,
    },
    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },
    compareAtPrice: {
      type: Number,
      default: null,
    },
    weightGrams: {
      type: Number,
      required: [true, "Package weight in grams is required"],
    },
    stockQuantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      default: 100,
      min: [0, "Stock cannot be negative"],
    },
    sku: {
      type: String,
      unique: true,
      trim: true,
    },
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Single-Origin & Traceability Details
    farmCluster: {
      name: {
        type: String,
        required: [true, "Farm cluster name is required"],
        trim: true,
      },
      region: {
        type: String,
        required: [true, "Farm region/state is required"],
        trim: true,
      },
      state: {
        type: String,
        required: [true, "State is required"],
        trim: true,
      },
    },
    harvestPeriod: {
      type: String,
      required: [true, "Harvest month/period is required"],
      trim: true,
    },
    labReportRef: {
      type: String,
      required: [true, "Lab certificate reference is required"],
      trim: true,
    },
    labReportUrl: {
      type: String, // Cloudinary PDF URL
      default: "",
    },
    shelfLife: {
      type: String,
      default: "12 months from packing",
    },

    // Ritual & Consumption Profile
    ritualTiming: {
      type: String,
      enum: ["Morning", "Afternoon", "Night", "Anytime"],
      default: "Morning",
    },
    ritualInstruction: {
      type: String,
      required: [true, "Two-minute ritual instruction is required"],
    },
    benefits: [
      {
        type: String,
        trim: true,
      },
    ],
    nutritionalFacts: nutritionalFactSchema,

    // Media & Visual Assets
    images: {
      type: [String], // Array of Cloudinary image URLs
      validate: [
        (arr) => arr.length > 0,
        "Product must have at least one image",
      ],
    },
    thumbnail: {
      type: String,
      default: "",
    },

    // Merchandising & Ratings
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
      index: true,
    },
    averageRating: {
      type: Number,
      default: 5.0,
      min: [1, "Rating must be at least 1"],
      max: [5, "Rating cannot exceed 5"],
    },
    totalReviews: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-populate thumbnail from images array if not set
productSchema.pre("save", function (next) {
  if (!this.thumbnail && this.images && this.images.length > 0) {
    this.thumbnail = this.images[0];
  }
  next();
});

export const Product = mongoose.model("Product", productSchema);