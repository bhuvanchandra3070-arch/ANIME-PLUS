const mongoose = require("mongoose");

// Connect to MongoDB
const connectDB = async () => {
  if (!process.env.MONGO_URI) {
    console.warn("⚠️ MONGO_URI not configured. Running without persistent database.");
    console.warn("📝 To enable MongoDB, add MONGO_URI to .env file");
    return;
  }

  try {
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("✅ MongoDB connected successfully");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error.message);
    console.warn("⚠️ Operating in fallback mode (in-memory only)");
  }
};

module.exports = connectDB;
