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
const allowedOrigins = (process.env.CLIENT_ORIGINS || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
    return callback(null, false);
  }
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// FRONTEND STATIC ASSETS
// ===============================
app.use("/backend", (req, res) => res.sendStatus(404));
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
      console.warn("⚠️ MongoDB connection failed; account and OTP requests will return unavailable:", error.message);
    });
} else {
  console.warn("⚠️ MONGO_URI is missing; account and OTP requests will return unavailable.");
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

app.get("/{*splat}", (req, res) => {
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
