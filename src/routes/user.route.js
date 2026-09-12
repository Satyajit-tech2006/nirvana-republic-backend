import { Router } from "express";
import {
  registerUser,
  loginUser,
  logoutUser,
  refreshAccessToken,
  getCurrentUser,
  updateAccountDetails,
  addAddress,
  deleteAddress,
  updateAddress,
  setDefaultAddress,
} from "../controllers/user.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

// Public Authentication Routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);
router.route("/refresh-token").post(refreshAccessToken);

// Secured Profile Routes
router.route("/logout").post(verifyJWT, logoutUser);
router.route("/me").get(verifyJWT, getCurrentUser);
router.route("/update-profile").patch(verifyJWT, updateAccountDetails);

// Address Management Routes
router.route("/addresses").post(verifyJWT, addAddress);
router.route("/addresses/:addressId").delete(verifyJWT, deleteAddress);
router.route("/addresses/:addressId").delete(verifyJWT, deleteAddress).put(verifyJWT, updateAddress);
router.route("/addresses/:addressId/default").patch(verifyJWT, setDefaultAddress);

export default router;