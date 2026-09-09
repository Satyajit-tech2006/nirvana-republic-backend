import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// @desc    Create new order & reserve inventory
// @route   POST /api/v1/orders
// @access  Private
export const createOrder = asyncHandler(async (req, res) => {
  const { items, shippingAddress, paymentMethod = "razorpay" } = req.body;

  if (!items || items.length === 0) {
    throw new ApiError(400, "No order items provided");
  }

  if (
    !shippingAddress ||
    !shippingAddress.name ||
    !shippingAddress.phone ||
    !shippingAddress.street ||
    !shippingAddress.city ||
    !shippingAddress.state ||
    !shippingAddress.postalCode
  ) {
    throw new ApiError(400, "Complete shipping address is required");
  }

  // Verify stock & compute price snapshots directly from database
  let itemsSubtotal = 0;
  const orderItems = [];

  for (const item of items) {
    const product = await Product.findById(item.productId);

    if (!product) {
      throw new ApiError(404, `Product not found: ${item.productId}`);
    }

    if (product.stockQuantity < item.quantity) {
      throw new ApiError(
        400,
        `Insufficient stock for "${product.name}". Only ${product.stockQuantity} remaining.`
      );
    }

    const lineTotal = product.price * item.quantity;
    itemsSubtotal += lineTotal;

    orderItems.push({
      product: product._id,
      name: product.name,
      slug: product.slug,
      image: product.thumbnail || product.images[0],
      price: product.price,
      weightGrams: product.weightGrams,
      quantity: item.quantity,
      lineTotal,
    });
  }

  // Free shipping threshold logic (Free above ₹799, otherwise ₹99)
  const shippingFee = itemsSubtotal >= 799 ? 0 : 99;
  const taxAmount = Math.round(itemsSubtotal * 0.05); // 5% GST snapshot
  const totalAmount = itemsSubtotal + shippingFee + taxAmount;

  const order = await Order.create({
    user: req.user._id,
    items: orderItems,
    shippingAddress,
    itemsSubtotal,
    shippingFee,
    taxAmount,
    totalAmount,
    paymentMethod,
    paymentStatus: paymentMethod === "cod" ? "pending" : "pending",
  });

  // Deduct inventory stock
  for (const item of orderItems) {
    await Product.findByIdAndUpdate(item.product, {
      $inc: { stockQuantity: -item.quantity },
    });
  }

  return res
    .status(201)
    .json(new ApiResponse(201, order, "Order placed successfully"));
});

// @desc    Verify payment signature (Razorpay/Online)
// @route   POST /api/v1/orders/:orderId/verify-payment
// @access  Private
export const verifyPayment = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { gatewayOrderId, gatewayPaymentId, gatewaySignature } = req.body;

  const order = await Order.findOne({ _id: orderId, user: req.user._id });
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  // Update order status on successful signature verification
  order.paymentStatus = "paid";
  order.orderStatus = "confirmed";
  order.gatewayOrderId = gatewayOrderId;
  order.gatewayPaymentId = gatewayPaymentId;
  order.gatewaySignature = gatewaySignature;

  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Payment verified and order confirmed"));
});

// @desc    Get logged-in user orders
// @route   GET /api/v1/orders/my-orders
// @access  Private
export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ user: req.user._id })
    .sort({ createdAt: -1 })
    .lean();

  return res
    .status(200)
    .json(new ApiResponse(200, orders, "User orders fetched successfully"));
});

// @desc    Get single order by ID
// @route   GET /api/v1/orders/:orderId
// @access  Private
export const getOrderById = asyncHandler(async (req, res) => {
  const { orderId } = req.params;

  const query = { _id: orderId };
  if (req.user.role !== "admin") {
    query.user = req.user._id;
  }

  const order = await Order.findOne(query).populate("user", "name email phone");
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order details fetched successfully"));
});

// @desc    Get all orders (Admin overview)
// @route   GET /api/v1/orders/admin/all
// @access  Private/Admin
export const getAllOrdersAdmin = asyncHandler(async (req, res) => {
  const { status, page = 1, limit = 20 } = req.query;

  const filter = {};
  if (status) filter.orderStatus = status;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.max(1, parseInt(limit, 10));
  const skip = (pageNum - 1) * limitNum;

  const [orders, totalOrders] = await Promise.all([
    Order.find(filter)
      .populate("user", "name email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean(),
    Order.countDocuments(filter),
  ]);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        orders,
        pagination: {
          totalOrders,
          totalPages: Math.ceil(totalOrders / limitNum),
          currentPage: pageNum,
        },
      },
      "All orders retrieved successfully"
    )
  );
});

// @desc    Update order status & fulfillment info
// @route   PATCH /api/v1/orders/:orderId/status
// @access  Private/Admin
export const updateOrderStatus = asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const { orderStatus, courierName, trackingNumber, trackingUrl } = req.body;

  const order = await Order.findById(orderId);
  if (!order) {
    throw new ApiError(404, "Order not found");
  }

  if (orderStatus) {
    order.orderStatus = orderStatus;
    if (orderStatus === "shipped") order.shippedAt = new Date();
    if (orderStatus === "delivered") order.deliveredAt = new Date();
    if (orderStatus === "cancelled") order.cancelledAt = new Date();
  }

  if (courierName) order.courierName = courierName;
  if (trackingNumber) order.trackingNumber = trackingNumber;
  if (trackingUrl) order.trackingUrl = trackingUrl;

  await order.save();

  return res
    .status(200)
    .json(new ApiResponse(200, order, "Order status updated successfully"));
});