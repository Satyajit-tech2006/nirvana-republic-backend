import "dotenv/config";
import http from "http";
import { v2 as cloudinary } from "cloudinary";

// Configure Cloudinary globally
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import connectDB from "./db/index.js";
import app from "./app.js";

// Pre-register all Mongoose models
import "./models/user.model.js";
import "./models/product.model.js";
import "./models/order.model.js";
import "./models/review.model.js";
import "./models/journal.model.js";

const PORT = process.env.PORT || 8000;

connectDB()
  .then(() => {
    const server = http.createServer(app);

    server.listen(PORT, () => {
      console.log(`🌿 Nirvana Republic API Server running on port ${PORT}`);
    });

    server.on("error", (err) => {
      console.error("❌ Server runtime error:", err);
    });
  })
  .catch((error) => {
    console.error("❌ Error starting Nirvana Republic server:", error);
    process.exit(1);
  });