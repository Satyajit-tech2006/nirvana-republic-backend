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
  searchUsers,
  getAllAdmins,
  updateUserPermissions,
} from "../controllers/user.controller.js";
import { verifyJWT, requirePermission } from "../middlewares/auth.middleware.js";

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
router
  .route("/addresses/:addressId")
  .put(verifyJWT, updateAddress)
  .delete(verifyJWT, deleteAddress);
router.route("/addresses/:addressId/default").patch(verifyJWT, setDefaultAddress);

// =========================================================================
// ADMIN USER MANAGEMENT ROUTES (Protected by MANAGE_USERS capability)
// =========================================================================
router
  .route("/admin/search")
  .get(verifyJWT, requirePermission("MANAGE_USERS"), searchUsers);

router
  .route("/admin/admins")
  .get(verifyJWT, requirePermission("MANAGE_USERS"), getAllAdmins);

router
  .route("/admin/:userId/permissions")
  .patch(verifyJWT, requirePermission("MANAGE_USERS"), updateUserPermissions);

export default router;