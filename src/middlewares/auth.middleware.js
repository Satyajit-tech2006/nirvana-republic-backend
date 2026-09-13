import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";

// Verify JWT from Authorization header or HTTP-only cookies
export const verifyJWT = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (!token) {
    throw new ApiError(401, "Unauthorized request: No access token provided");
  }

  try {
    const decodedToken = jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET
    );

    const user = await User.findById(decodedToken?._id || decodedToken?.id).select(
      "-password -refreshToken"
    );

    if (!user) {
      throw new ApiError(401, "Invalid access token: User not found");
    }

    req.user = user;
    next();
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid or expired access token");
  }
});

// Optional authentication middleware for guest/logged-in checkouts
export const optionalAuth = asyncHandler(async (req, res, next) => {
  const token =
    req.cookies?.accessToken ||
    req.header("Authorization")?.replace("Bearer ", "");

  if (token) {
    try {
      const decodedToken = jwt.verify(
        token,
        process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET
      );

      req.user = await User.findById(
        decodedToken?._id || decodedToken?.id
      ).select("-password -refreshToken");
    } catch {
      // Ignore invalid/expired tokens for optional guest access
      req.user = null;
    }
  }

  next();
});

// General Admin authorization guard (verifies base admin role)
export const verifyAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== "admin") {
    throw new ApiError(403, "Access forbidden: Admin privileges required");
  }
  next();
};

// Granular capability guard: verifies if admin holds the specific permission(s)
export const requirePermission = (...requiredPermissions) => {
  return (req, res, next) => {
    if (!req.user || req.user.role !== "admin") {
      throw new ApiError(403, "Access forbidden: Admin privileges required");
    }

    const userPermissions = Array.isArray(req.user.permissions)
      ? req.user.permissions
      : [];

    // Check if the user has at least one of the required permissions passed to the guard
    const hasAccess = requiredPermissions.some((perm) =>
      userPermissions.includes(perm)
    );

    if (!hasAccess) {
      throw new ApiError(
        403,
        `Access forbidden: You lack the required permission (${requiredPermissions.join(
          " or "
        )}) to perform this action.`
      );
    }

    next();
  };
};

// Aliases for compatibility
export const protect = verifyJWT;
export const admin = verifyAdmin;