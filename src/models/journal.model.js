import mongoose, { Schema } from "mongoose";

const journalSchema = new Schema(
  {
    title: {
      type: String,
      required: [true, "Article title is required"],
      trim: true,
      index: true,
    },
    slug: {
      type: String,
      required: [true, "Article slug is required"],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    excerpt: {
      type: String,
      required: [true, "Article excerpt is required"],
      trim: true,
      maxlength: [300, "Excerpt cannot exceed 300 characters"],
    },
    content: {
      type: String,
      required: [true, "Article content body (Markdown/HTML) is required"],
    },
    category: {
      type: String,
      required: [true, "Category is required"],
      enum: ["Farm Stories", "Rituals", "Nutrition Notes", "Recipes"],
      default: "Rituals",
      index: true,
    },
    coverImage: {
      type: String,
      required: [true, "Cover image URL is required"],
    },
    author: {
      name: {
        type: String,
        required: [true, "Author name is required"],
        default: "Nirvana Editorial",
      },
      role: {
        type: String,
        default: "Botanical Research Lead",
      },
      avatar: {
        type: String,
        default: "",
      },
    },
    readTimeMinutes: {
      type: Number,
      default: 4,
      min: [1, "Read time must be at least 1 minute"],
    },
    relatedProducts: [
      {
        type: Schema.Types.ObjectId,
        ref: "Product",
      },
    ],
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    publishedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Auto-set publishedAt timestamp when article is published
journalSchema.pre("save", function (next) {
  if (this.isModified("isPublished") && this.isPublished && !this.publishedAt) {
    this.publishedAt = new Date();
  }
  next();
});

export const Journal = mongoose.model("Journal", journalSchema);