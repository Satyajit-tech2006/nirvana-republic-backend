import mongoose from "mongoose";

// Cache connection state across serverless/monolithic invocations
let isConnected = false;

const connectDB = async () => {
  // Use existing connection if already established
  if (isConnected || mongoose.connection.readyState === 1) {
    isConnected = true;
    return;
  }

  const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MongoDB connection string (MONGODB_URI) is not defined in environment variables");
  }

  try {
    const conn = await mongoose.connect(mongoUri, {
      dbName: "nirvana_republic", // Isolates data in a dedicated 'nirvana_republic' database
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = true;
    console.log(`🍃 MongoDB connected: ${conn.connection.host} | Database: ${conn.connection.name}`);
  } catch (error) {
    isConnected = false;
    console.error("❌ MongoDB connection error:", error.message);
    throw error;
  }
};

export default connectDB;