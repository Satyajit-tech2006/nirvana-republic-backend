import { Router } from "express";
import {
  createOrder,
  verifyPayment,
  getMyOrders,
  getOrderById,
  getAllOrdersAdmin,
  updateOrderStatus,
} from "../controllers/order.controller.js";
import { verifyJWT, verifyAdmin } from "../middlewares/auth.middleware.js";

const router = Router();

// All order operations require authentication
router.use(verifyJWT);

// Customer Routes
router.route("/").post(createOrder);
router.route("/my-orders").get(getMyOrders);
router.route("/:orderId").get(getOrderById);
router.route("/:orderId/verify-payment").post(verifyPayment);

// Admin Fulfillment Routes
router.route("/admin/all").get(verifyAdmin, getAllOrdersAdmin);
router.route("/:orderId/status").patch(verifyAdmin, updateOrderStatus);

export default router;