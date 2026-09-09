import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Get all products with filtering, sorting & pagination
// @route   GET /api/v1/products
// @access  Public
export const getAllProducts = asyncHandler(async (req, res) => {
  const {
    category,
    search,
    minPrice,
    maxPrice,
    sort = "createdAt",
    order = "desc",
    page = 1,
    limit = 12,
  } = req.query;

  const query = { isAvailable: true };

  // Category filter
  if (category && category !== "all") {
    query.category = category.toLowerCase();
  }

  // Text search on name, tagline, and benefits
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { tagline: { $regex: search, $options: "i" } },
      { benefits: { $in: [new RegExp(search, "i")] } },
    ];
  }

  // Price range filter
  if (minPrice || maxPrice) {
    query.price = {};
    if (minPrice) query.price.$gte = Number(minPrice);
    if (maxPrice) query.price.$lte = Number(maxPrice);
  }

  const sortOrder = order === "asc" ? 1 : -1;
  const sortCriteria = { [sort]: sortOrder };

  const pageNumber = Math.max(1, parseInt(page, 10));
  const limitNumber = Math.max(1, parseInt(limit, 10));
  const skip = (pageNumber - 1) * limitNumber;

  const [products, totalProducts] = await Promise.all([
    Product.find(query)
      .sort(sortCriteria)
      .skip(skip)
      .limit(limitNumber)
      .lean(),
    Product.countDocuments(query),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        products,
        pagination: {
          totalProducts,
          totalPages: Math.ceil(totalProducts / limitNumber),
          currentPage: pageNumber,
          limit: limitNumber,
        },
      },
      "Products fetched successfully"
    )
  );
});

// @desc    Get single product by slug
// @route   GET /api/v1/products/slug/:slug
// @access  Public
export const getProductBySlug = asyncHandler(async (req, res) => {
  const { slug } = req.params;

  const product = await Product.findOne({ slug: slug.toLowerCase() }).lean();
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product details fetched successfully"));
});

// @desc    Get featured products for homepage
// @route   GET /api/v1/products/featured
// @access  Public
export const getFeaturedProducts = asyncHandler(async (req, res) => {
  const products = await Product.find({ isFeatured: true, isAvailable: true })
    .limit(8)
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, products, "Featured products fetched successfully"));
});

// @desc    Create a new product
// @route   POST /api/v1/products
// @access  Private/Admin
export const createProduct = asyncHandler(async (req, res) => {
  const {
    name,
    slug,
    tagline,
    description,
    category,
    price,
    compareAtPrice,
    weightGrams,
    stockQuantity,
    sku,
    farmCluster,
    harvestPeriod,
    labReportRef,
    labReportUrl,
    shelfLife,
    ritualTiming,
    ritualInstruction,
    benefits,
    nutritionalFacts,
    images,
    isFeatured,
    isBestSeller,
  } = req.body;

  if (
    !name ||
    !slug ||
    !tagline ||
    !description ||
    !category ||
    !price ||
    !weightGrams ||
    !farmCluster ||
    !harvestPeriod ||
    !labReportRef ||
    !ritualInstruction ||
    !images?.length
  ) {
    throw new ApiError(400, "All required product and origin fields must be provided");
  }

  const existingProduct = await Product.findOne({ slug: slug.toLowerCase() });
  if (existingProduct) {
    throw new ApiError(409, "A product with this slug already exists");
  }

  const product = await Product.create({
    name,
    slug: slug.toLowerCase(),
    tagline,
    description,
    category: category.toLowerCase(),
    price,
    compareAtPrice,
    weightGrams,
    stockQuantity: stockQuantity ?? 100,
    sku: sku || `NR-${slug.toUpperCase()}-${weightGrams}G`,
    farmCluster,
    harvestPeriod,
    labReportRef,
    labReportUrl: labReportUrl || "",
    shelfLife,
    ritualTiming,
    ritualInstruction,
    benefits: benefits || [],
    nutritionalFacts,
    images,
    thumbnail: images[0],
    isFeatured: isFeatured ?? false,
    isBestSeller: isBestSeller ?? false,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
});

// @desc    Update product details
// @route   PATCH /api/v1/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndUpdate(
    id,
    { $set: req.body },
    { new: true, runValidators: true }
  );

  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, product, "Product updated successfully"));
});

// @desc    Delete a product
// @route   DELETE /api/v1/products/:id
// @access  Private/Admin
export const deleteProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findByIdAndDelete(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Product deleted successfully"));
});