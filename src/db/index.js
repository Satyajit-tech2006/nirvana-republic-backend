import mongoose from "mongoose";

// Cache connection state
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;

  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // Disables buffering so Mongoose throws the real network error instantly
      bufferCommands: false,
      serverSelectionTimeoutMS: 5000,
    });
    
    isConnected = true;
    console.log(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error("Error connecting to MongoDB:", error.message);
    // Throw error instead of exiting the process so serverless functions handle it
    throw error;
  }
};

export default connectDB;