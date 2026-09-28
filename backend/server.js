const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// ===============================
// MIDDLEWARE
// ===============================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// FRONTEND STATIC ASSETS
// ===============================
app.use(express.static(path.join(__dirname, "..")));

// ===============================
// DATABASE CONFIGURATION
// ===============================
if (process.env.MONGO_URI && !process.env.MONGO_URI.includes("username:password")) {
  mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
      console.log("✅ MongoDB connected successfully");
    })
    .catch((error) => {
      console.warn("⚠️ MongoDB connection warning (running with local fallback):", error.message);
      console.warn("💡 To use MongoDB, ensure MONGO_URI is correctly set in .env");
    });
} else {
  console.log("ℹ️ Operating with in-memory / local storage fallback mode.");
  console.log("💡 Add valid MONGO_URI to .env file to enable cloud persistence");
}

// ===============================
// ROUTES
// ===============================
const authRoutes = require("./routes/auth");
const animeRoutes = require("./routes/anime");

app.use("/api/auth", authRoutes);
app.use("/api/anime", animeRoutes);

// ===============================
// API STATUS ENDPOINT
// ===============================
app.get("/api", (req, res) => {
  res.json({
    success: true,
    message: "ANIME.PLUS Streaming API is running smoothly",
    version: "2.0.0",
    endpoints: {
      auth: "/api/auth",
      anime: "/api/anime"
    }
  });
});

// ===============================
// ERROR HANDLING MIDDLEWARE
// ===============================
app.use((err, req, res, next) => {
  console.error("Error:", err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error"
  });
});

// ===============================
// PAGE ROUTING & SPA FALLBACK (Keep at end)
// ===============================
const HTML_PAGES = ["login", "register", "forgot-password", "browse", "trailers", "movies", "schedule", "watchlist", "premium", "profile", "watch"];

HTML_PAGES.forEach((page) => {
  app.get(`/${page}`, (req, res) => {
    res.sendFile(path.join(__dirname, "..", `${page}.html`));
  });
  app.get(`/${page}.html`, (req, res) => {
    res.sendFile(path.join(__dirname, "..", `${page}.html`));
  });
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "index.html"));
});

// ===============================
// START SERVER
// ===============================
app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(` 🎌 ANIME.PLUS Streaming API`);
  console.log(` 📍 Running at: http://localhost:${PORT}`);
  console.log(` 📚 API Docs: http://localhost:${PORT}/api`);
  console.log(`========================================\n`);
});