import multer from "multer";
import path from "path";
import fs from "fs";
import os from "os";
import { ApiError } from "../utils/ApiError.js";

// Use /tmp on Vercel; use ./public/temp when developing locally
const tempDir = process.env.VERCEL ? os.tmpdir() : "./public/temp";

if (!fs.existsSync(tempDir)) {
  try {
    fs.mkdirSync(tempDir, { recursive: true });
  } catch (err) {
    console.warn("Could not create temp directory:", err.message);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${uniqueSuffix}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/avif",
    "application/pdf",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ApiError(
        400,
        "Invalid file type. Only JPEG, PNG, WEBP, AVIF, and PDF files are allowed."
      ),
      false
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter,
});