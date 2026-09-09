import mongoose from "mongoose";

/**
 * Global cache across serverless warm-invocations.
 * In Node.js / Vercel serverless runtime, `global` persists across warm invocations.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

const connectDB = async () => {
  // If already connected, reuse existing instance
  if (cached.conn && mongoose.connection.readyState === 1) {
    return cached.conn;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error(
      "MongoDB connection string (MONGODB_URI) is not defined in environment variables"
    );
  }

  // If a connection promise is already resolving, wait for it instead of starting a new one
  if (!cached.promise) {
    const opts = {
      dbName: "nirvana_republic",
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
    };

    cached.promise = mongoose.connect(mongoUri, opts).then((mongooseInstance) => {
      console.log(
        `🍃 MongoDB connected: ${mongooseInstance.connection.host} | Database: ${mongooseInstance.connection.name}`
      );
      return mongooseInstance;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (error) {
    cached.promise = null;
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }

  return cached.conn;
};

export default connectDB;