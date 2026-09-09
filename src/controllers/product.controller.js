import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadBufferToCloudinary } from "../utils/cloudinary.js";

// Helper: Safely parse JSON strings sent via multipart/form-data
const safeJsonParse = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

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

// @desc    Create a new product with Cloudinary image/PDF uploads
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
    shelfLife,
    ritualTiming,
    ritualInstruction,
    benefits,
    nutritionalFacts,
    isFeatured,
    isBestSeller,
  } = req.body;

  // Parse structured objects passed via multipart/form-data
  const parsedFarmCluster = safeJsonParse(farmCluster, farmCluster);
  const parsedBenefits = safeJsonParse(benefits, []);
  const parsedNutritionalFacts = safeJsonParse(nutritionalFacts, nutritionalFacts);

  if (
    !name ||
    !slug ||
    !tagline ||
    !description ||
    !category ||
    !price ||
    !weightGrams ||
    !parsedFarmCluster?.name ||
    !harvestPeriod ||
    !labReportRef ||
    !ritualInstruction
  ) {
    throw new ApiError(400, "All required product and origin fields must be provided");
  }

  const existingProduct = await Product.findOne({ slug: slug.toLowerCase() });
  if (existingProduct) {
    throw new ApiError(409, "A product with this slug already exists");
  }

  // Upload product images to Cloudinary
  const uploadedImageUrls = [];
  if (req.files?.images && req.files.images.length > 0) {
    for (const file of req.files.images) {
      const uploadResult = await uploadBufferToCloudinary(
        file.buffer,
        "nirvana_republic/products"
      );
      if (uploadResult?.secure_url) {
        uploadedImageUrls.push(uploadResult.secure_url);
      }
    }
  } else if (req.body.images) {
    // Support pre-uploaded array of URLs
    const bodyImages = Array.isArray(req.body.images)
      ? req.body.images
      : [req.body.images];
    uploadedImageUrls.push(...bodyImages);
  }

  if (uploadedImageUrls.length === 0) {
    throw new ApiError(400, "At least one product image is required");
  }

  // Optional: Upload Lab Report Document (PDF/Image)
  let labReportUrl = req.body.labReportUrl || "";
  if (req.files?.labReport && req.files.labReport.length > 0) {
    const labUploadResult = await uploadBufferToCloudinary(
      req.files.labReport[0].buffer,
      "nirvana_republic/lab_reports"
    );
    if (labUploadResult?.secure_url) {
      labReportUrl = labUploadResult.secure_url;
    }
  }

  const product = await Product.create({
    name,
    slug: slug.toLowerCase(),
    tagline,
    description,
    category: category.toLowerCase(),
    price: Number(price),
    compareAtPrice: compareAtPrice ? Number(compareAtPrice) : null,
    weightGrams: Number(weightGrams),
    stockQuantity: stockQuantity ? Number(stockQuantity) : 100,
    sku: sku || `NR-${slug.toUpperCase()}-${weightGrams}G`,
    farmCluster: parsedFarmCluster,
    harvestPeriod,
    labReportRef,
    labReportUrl,
    shelfLife: shelfLife || "12 months from packing",
    ritualTiming: ritualTiming || "Morning",
    ritualInstruction,
    benefits: parsedBenefits,
    nutritionalFacts: parsedNutritionalFacts,
    images: uploadedImageUrls,
    thumbnail: uploadedImageUrls[0],
    isFeatured: isFeatured === "true" || isFeatured === true,
    isBestSeller: isBestSeller === "true" || isBestSeller === true,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, product, "Product created successfully"));
});

// @desc    Update product details and upload extra images
// @route   PATCH /api/v1/products/:id
// @access  Private/Admin
export const updateProduct = asyncHandler(async (req, res) => {
  const { id } = req.params;

  const product = await Product.findById(id);
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const updateData = { ...req.body };

  // Parse nested form fields if present
  if (req.body.farmCluster) {
    updateData.farmCluster = safeJsonParse(req.body.farmCluster, req.body.farmCluster);
  }
  if (req.body.benefits) {
    updateData.benefits = safeJsonParse(req.body.benefits, req.body.benefits);
  }
  if (req.body.nutritionalFacts) {
    updateData.nutritionalFacts = safeJsonParse(
      req.body.nutritionalFacts,
      req.body.nutritionalFacts
    );
  }

  // Handle new image additions
  if (req.files?.images && req.files.images.length > 0) {
    const newImageUrls = [];
    for (const file of req.files.images) {
      const uploadResult = await uploadBufferToCloudinary(
        file.buffer,
        "nirvana_republic/products"
      );
      if (uploadResult?.secure_url) {
        newImageUrls.push(uploadResult.secure_url);
      }
    }
    updateData.images = [...(product.images || []), ...newImageUrls];
    updateData.thumbnail = updateData.images[0];
  }

  // Handle updated lab report file
  if (req.files?.labReport && req.files.labReport.length > 0) {
    const labUploadResult = await uploadBufferToCloudinary(
      req.files.labReport[0].buffer,
      "nirvana_republic/lab_reports"
    );
    if (labUploadResult?.secure_url) {
      updateData.labReportUrl = labUploadResult.secure_url;
    }
  }

  const updatedProduct = await Product.findByIdAndUpdate(
    id,
    { $set: updateData },
    { new: true, runValidators: true }
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedProduct, "Product updated successfully"));
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