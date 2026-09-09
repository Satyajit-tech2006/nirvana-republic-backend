import crypto from "crypto";
import axios from "axios";
import { Order } from "../models/order.model.js";
import { User } from "../models/user.model.js";

const PHONEPE_MERCHANT_ID = process.env.PHONEPE_MERCHANT_ID || "PGTESTPAYUAT";
const PHONEPE_SALT_KEY = process.env.PHONEPE_SALT_KEY || "099eb0cd-02cf-4e2a-8aca-3e6c6aff0399";
const PHONEPE_SALT_INDEX = process.env.PHONEPE_SALT_INDEX || 1;
const PHONEPE_HOST_URL = process.env.PHONEPE_HOST_URL || "https://api-preprod.phonepe.com/apis/pg-sandbox";

export const initiatePayment = async (req, res) => {
  try {
    const { orderId } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" });
    }

    const merchantTransactionId = `MT_${order._id}_${Date.now()}`;
    const amountInPaise = Math.round(order.finalTotal * 100);

    const paymentPayload = {
      merchantId: PHONEPE_MERCHANT_ID,
      merchantTransactionId,
      merchantUserId: order.user ? order.user.toString() : `GUEST_${order.shippingAddress.phone}`,
      amount: amountInPaise,
      redirectUrl: `${process.env.FRONTEND_URL || "http://localhost:5173"}/orders/track/${order._id}`,
      redirectMode: "REDIRECT",
      callbackUrl: `${process.env.BACKEND_URL || "http://localhost:8000"}/api/v1/payments/webhook`,
      mobileNumber: order.shippingAddress.phone,
      paymentInstrument: { type: "PAY_PAGE" },
    };

    const base64Payload = Buffer.from(JSON.stringify(paymentPayload)).toString("base64");
    const stringToHash = `${base64Payload}/pg/v1/pay${PHONEPE_SALT_KEY}`;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const xVerifyChecksum = `${sha256}###${PHONEPE_SALT_INDEX}`;

    const response = await axios.post(
      `${PHONEPE_HOST_URL}/pg/v1/pay`,
      { request: base64Payload },
      { headers: { "Content-Type": "application/json", "X-VERIFY": xVerifyChecksum } }
    );

    if (response.data.success) {
      return res.status(200).json({ 
        success: true, 
        redirectUrl: response.data.data.instrumentResponse.redirectInfo.url, 
        merchantTransactionId 
      });
    }

    return res.status(400).json({ success: false, message: "Payment initiation failed" });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const checkPaymentStatus = async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    const orderId = merchantTransactionId.split("_")[1];

    const stringToHash = `/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}${PHONEPE_SALT_KEY}`;
    const sha256 = crypto.createHash("sha256").update(stringToHash).digest("hex");
    const xVerify = `${sha256}###${PHONEPE_SALT_INDEX}`;

    const response = await axios.get(
      `${PHONEPE_HOST_URL}/pg/v1/status/${PHONEPE_MERCHANT_ID}/${merchantTransactionId}`,
      { headers: { "Content-Type": "application/json", "X-VERIFY": xVerify, "X-MERCHANT-ID": PHONEPE_MERCHANT_ID } }
    );

    if (response.data.success && response.data.code === "PAYMENT_SUCCESS") {
      const order = await Order.findById(orderId);
      if (order && order.paymentStatus !== "Paid") {
        order.paymentStatus = "Paid";
        order.orderStatus = "Confirmed";
        await order.save();

        // Automated Token Credit on Gateway Success
        if (order.user && order.tokensEarned > 0) {
          await User.findByIdAndUpdate(order.user, { $inc: { walletTokens: order.tokensEarned } });
        }

        return res.status(200).json({ success: true, paid: true, order });
      }
      return res.status(200).json({ success: true, paid: true, order });
    }

    return res.status(200).json({ success: true, paid: false, status: response.data.code });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};