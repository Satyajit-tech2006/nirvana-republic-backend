import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import connectDB from "./db/index.js";

// Import Routes
import userRouter from "./routes/user.route.js";
import productRouter from "./routes/product.route.js";
import orderRouter from "./routes/order.route.js";
import reviewRouter from "./routes/review.route.js";
import journalRouter from "./routes/journal.route.js";

const app = express();

// Trust reverse proxy for Vercel edge deployment
app.set("trust proxy", 1);

// 1. CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:8080",
  "https://nirvana-republic-frontend-five.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g., mobile apps, Postman, curl)
    if (!origin) return callback(null, true);

    const sanitizedOrigin = origin.replace(/\/$/, "");
    const isAllowed =
      allowedOrigins.includes(sanitizedOrigin) ||
      sanitizedOrigin.endsWith(".vercel.app");

    if (isAllowed) {
      return callback(null, true);
    }
    // Return false instead of throwing Error to prevent unhandled 500 crashes
    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "X-Requested-With",
    "Accept",
  ],
  optionsSuccessStatus: 204,
  maxAge: 86400,
};

// Apply CORS & handle preflights before any other middleware
app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

// 2. Security Headers (Configured for cross-origin assets & APIs)
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginOpenerPolicy: false,
  })
);

// 3. Rate Limiting (Bypass preflight OPTIONS requests)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === "OPTIONS",
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
  },
});
app.use("/api", limiter);

// 4. Body Parsers, Static Assets & Cookies
app.use(express.json({ limit: "50kb" }));
app.use(express.urlencoded({ extended: true, limit: "50kb" }));
app.use(express.static("public"));
app.use(cookieParser());

// 5. Database Connection Middleware (Bypass on preflights)
app.use(async (req, res, next) => {
  if (req.method === "OPTIONS") return next();

  try {
    await connectDB();
    next();
  } catch (error) {
    console.error("Database connection middleware failure:", error.message);
    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// Health Check & Wake Endpoint
app.get("/api/v1/ping", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Nirvana Republic API is awake",
    timestamp: new Date().toISOString(),
  });
});

// Mount Routes
app.use("/api/v1/users", userRouter);
app.use("/api/v1/products", productRouter);
app.use("/api/v1/orders", orderRouter);
app.use("/api/v1/reviews", reviewRouter);
app.use("/api/v1/journal", journalRouter);

// Global Error Handler
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const message = err.message || "Internal Server Error";

  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errors: err.errors || [],
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
});

export default app;