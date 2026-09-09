import 'dotenv/config';
import { v2 as cloudinary } from 'cloudinary'; // <-- Import cloudinary

// Configure Cloudinary explicitly here
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

import connectDB from "./db/index.js";
import app from "./app.js";
import http from 'http';

// Import models once to ensure Mongoose registers them
import './models/user.model.js';
import './models/product.model.js';
import './models/order.model.js';

connectDB()
.then(() => {
    const server = http.createServer(app);

    server.listen(process.env.PORT || 8000, () => {
        console.log(`🚀 Saanvi Fashion API Server running on port ${process.env.PORT || 8000}`);
    });

    server.on("error", (err) => console.error("Server error:", err));
})
.catch((error) => console.error("Error starting server:", error));