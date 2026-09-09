import express from "express";
import { initiatePayment, checkPaymentStatus } from "../controllers/payment.controller.js";
import { optionalAuth } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/initiate", optionalAuth, initiatePayment);
router.get("/status/:merchantTransactionId", optionalAuth, checkPaymentStatus);

export default router;