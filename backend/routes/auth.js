const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const crypto = require("crypto");
const mongoose = require("mongoose");
const User = require("../user");
const protect = require("../auth");
const rateLimit = require("../config/rate-limit");
const { requiredSecret } = require("../config/secrets");
const { deliverOtp, isOtpDeliveryConfigured } = require("../otp-delivery");

const JWT_SECRET = requiredSecret("JWT_SECRET");
const OTP_SECRET = requiredSecret("OTP_SECRET");
const JWT_EXPIRE = "7d";
const REFRESH_TOKEN_EXPIRE = "30d";
const sendOtpLimit = rateLimit({ limit: 5, windowMs: 10 * 60 * 1000 });
const sendOtpTargetLimit = rateLimit({
    limit: 3,
    windowMs: 10 * 60 * 1000,
    key: (req) => `${req.ip}:${String(req.body?.email || req.body?.phone || "").toLowerCase().replace(/\s/g, "").slice(0, 320)}`
});
const verifyOtpLimit = rateLimit({ limit: 10, windowMs: 10 * 60 * 1000 });
const loginLimit = rateLimit({ limit: 10, windowMs: 10 * 60 * 1000 });
const registerLimit = rateLimit({ limit: 5, windowMs: 60 * 60 * 1000 });

function requireDatabase(req, res, next) {
    if (mongoose.connection.readyState !== 1) {
        return res.status(503).json({ success: false, message: "Sign-in is temporarily unavailable. Please try again shortly." });
    }
    next();
}

router.use(requireDatabase);

function hashOtp(code) {
    return crypto.createHmac("sha256", OTP_SECRET).update(code).digest("hex");
}

function validOtpHash(code, expectedHash) {
    const actual = Buffer.from(hashOtp(code), "hex");
    const expected = Buffer.from(expectedHash || "", "hex");
    return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}

function normalizePhone(value) {
    return String(value || "").replace(/[\s()-]/g, "");
}

// Helper: Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Helper: Generate Refresh Token
const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
};

// ============ SEND OTP (EMAIL & MOBILE) ============
router.post("/send-otp", sendOtpLimit, sendOtpTargetLimit, requireDatabase, async (req, res) => {
    try {
        const { email, phone, type, channel = "sms", purpose = "login" } = req.body || {};
        if (!["email", "mobile"].includes(type) || !["login", "password_reset"].includes(purpose)) {
            return res.status(400).json({ success: false, message: "Invalid verification request" });
        }
        if (channel !== "sms") {
            return res.status(400).json({ success: false, message: "Invalid delivery option" });
        }

        const target = type === "mobile" ? normalizePhone(phone) : String(email || "").trim().toLowerCase();
        const validTarget = type === "mobile" ? /^\+[1-9]\d{7,14}$/.test(target) : /^\S+@\S+\.\S+$/.test(target);
        if (!validTarget) {
            return res.status(400).json({ success: false, message: type === "mobile" ? "Enter a valid phone number with country code" : "Enter a valid email address" });
        }
        if (!isOtpDeliveryConfigured({ type, channel })) {
            return res.status(503).json({ success: false, message: "Code delivery is unavailable right now. Please try again later." });
        }

        let user = type === "mobile" ? await User.findOne({ phone: target }) : await User.findOne({ email: target });
        if (!user && purpose === "password_reset") {
            return res.json({ success: true, message: "If the account exists, a verification code has been sent." });
        }

        let isNewUser = false;
        if (!user) {
            isNewUser = true;
            const suffix = crypto.randomBytes(12).toString("hex");
            user = new User({
                name: type === "mobile" ? `Anime fan ${target.slice(-4)}` : target.split("@")[0].slice(0, 40),
                email: type === "email" ? target : `phone-${suffix}@accounts.anime-plus.invalid`,
                phone: type === "mobile" ? target : undefined
            });
        }

        const otpCode = crypto.randomInt(100000, 1000000).toString();
        user.otp = {
            codeHash: hashOtp(otpCode),
            expiresAt: new Date(Date.now() + 10 * 60 * 1000),
            type,
            target,
            purpose,
            channel: type === "email" ? "email" : channel,
            attempts: 0
        };
        await user.save();

        try {
            await deliverOtp({ target, code: otpCode, type, channel });
        } catch (deliveryError) {
            user.otp = undefined;
            if (isNewUser) await user.deleteOne();
            else await user.save();
            console.error("OTP delivery failed:", deliveryError.message);
            return res.status(503).json({ success: false, message: "Code delivery is unavailable right now. Please try again later." });
        }

        return res.json({ success: true, message: "If the account exists, a verification code has been sent." });
    } catch (error) {
        console.error("Send OTP error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to send OTP"
        });
    }
});

// ============ VERIFY OTP & LOGIN ============
router.post("/verify-otp", verifyOtpLimit, requireDatabase, async (req, res) => {
    try {
        const { email, phone, otp, type } = req.body;
        const target = type === "mobile" ? normalizePhone(phone) : String(email || "").trim().toLowerCase();

        if (!target || !/^\d{6}$/.test(String(otp || "")) || !["email", "mobile"].includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Please provide target and 6-digit OTP code"
            });
        }

        let user = null;
        if (type === "mobile") {
            user = await User.findOne({ phone: target });
        } else {
            user = await User.findOne({ email: target.toLowerCase() });
        }

        if (!user || !user.otp || !user.otp.codeHash || user.otp.purpose !== "login" || user.otp.target !== target || user.otp.type !== type) {
            return res.status(400).json({
                success: false,
                message: "No OTP requested for this account. Please request a new code."
            });
        }

        if (new Date() > user.otp.expiresAt || user.otp.attempts >= 5) {
            user.otp = undefined;
            await user.save();
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP code"
            });
        }

        if (!validOtpHash(String(otp), user.otp.codeHash)) {
            user.otp.attempts += 1;
            if (user.otp.attempts >= 5) user.otp = undefined;
            await user.save();
            return res.status(400).json({ success: false, message: "Invalid or expired OTP code" });
        }

        // Update name if provided
        if (req.body.name && req.body.name.trim()) {
            user.name = req.body.name.trim();
        }

        // Clear OTP after successful verification
        user.otp = undefined;
        if (type === "email") user.isEmailVerified = true;
        if (type === "mobile") user.isPhoneVerified = true;
        user.lastLogin = new Date();

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        user.refreshTokens.push({
            token: refreshToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        await user.save();

        res.json({
            success: true,
            message: "OTP verified successfully!",
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                avatar: user.avatar,
                tier: user.tier
            }
        });
    } catch (error) {
        console.error("Verify OTP error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "OTP verification failed"
        });
    }
});

// ============ SET PASSWORD (For OTP Users) ============
router.post("/set-password", protect, async (req, res) => {
    try {
        const { newPassword, confirmPassword } = req.body;

        if (!newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        const user = await User.findById(req.userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: "Password set successfully!"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ RESET PASSWORD WITH OTP ============
router.post("/reset-password", verifyOtpLimit, requireDatabase, async (req, res) => {
    try {
        const { target, otp, newPassword, confirmPassword } = req.body;

        if (!target || !otp || !newPassword || newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Please provide all required fields"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        const normalizedTarget = target.includes("@") ? target.trim().toLowerCase() : normalizePhone(target);
        const type = normalizedTarget.includes("@") ? "email" : "mobile";
        const user = type === "email"
            ? await User.findOne({ email: normalizedTarget })
            : await User.findOne({ phone: normalizedTarget });

        if (!user || !user.otp || user.otp.purpose !== "password_reset" || user.otp.type !== type || user.otp.target !== normalizedTarget || new Date() > user.otp.expiresAt || user.otp.attempts >= 5) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP code"
            });
        }

        if (!/^\d{6}$/.test(String(otp)) || !validOtpHash(String(otp), user.otp.codeHash)) {
            user.otp.attempts += 1;
            if (user.otp.attempts >= 5) user.otp = undefined;
            await user.save();
            return res.status(400).json({ success: false, message: "Invalid or expired OTP code" });
        }

        user.password = newPassword;
        user.otp = undefined;
        await user.save();

        res.json({
            success: true,
            message: "Password reset successfully!"
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// ============ REGISTER ============
router.post("/register", registerLimit, async (req, res) => {
    try {
        const { name, email, password, confirmPassword } = req.body;

        // Validation
        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide name, email, and password"
            });
        }

        if (password.length < 6) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 6 characters long"
            });
        }

        if (password !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "Passwords do not match"
            });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "Email already registered. Please sign in instead."
            });
        }

        // Create new user
        const user = new User({
            name: name.trim(),
            email: email.toLowerCase().trim(),
            password
        });

        await user.save();

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Save refresh token to database
        user.refreshTokens.push({
            token: refreshToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        user.lastLogin = new Date();
        await user.save();

        res.status(201).json({
            success: true,
            message: "Account created successfully!",
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                tier: user.tier
            }
        });
    } catch (error) {
        console.error("Register error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error creating account"
        });
    }
});

// ============ LOGIN ============
router.post("/login", loginLimit, async (req, res) => {
    try {
        const identifier = (req.body.email || req.body.phone || req.body.identifier || "").trim().toLowerCase();
        const password = req.body.password;

        // Validation
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: "Please provide email/phone and password"
            });
        }

        // Find user by email OR phone
        const user = await User.findOne({
            $or: [{ email: identifier }, { phone: identifier }]
        }).select("+password");

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "Invalid email/phone or password"
            });
        }

        // Compare passwords
        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return res.status(401).json({
                success: false,
                message: "Invalid email or password"
            });
        }

        // Generate tokens
        const token = generateToken(user._id);
        const refreshToken = generateRefreshToken(user._id);

        // Save refresh token
        user.refreshTokens.push({
            token: refreshToken,
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });

        // Keep only last 5 refresh tokens
        if (user.refreshTokens.length > 5) {
            user.refreshTokens = user.refreshTokens.slice(-5);
        }

        user.lastLogin = new Date();
        await user.save();

        res.json({
            success: true,
            message: "Logged in successfully!",
            token,
            refreshToken,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                tier: user.tier,
                watchlist: user.watchlist,
                favorites: user.favorites
            }
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Error during login"
        });
    }
});

// ============ REFRESH TOKEN ============
router.post("/refresh-token", async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required"
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, JWT_SECRET);
        const user = await User.findById(decoded.userId);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "User not found"
            });
        }

        // Check if refresh token exists and is valid
        const tokenExists = user.refreshTokens.some(
            (rt) => rt.token === refreshToken && new Date() < rt.expiresAt
        );

        if (!tokenExists) {
            return res.status(401).json({
                success: false,
                message: "Refresh token expired or invalid"
            });
        }

        // Generate new access token
        const newToken = generateToken(user._id);

        res.json({
            success: true,
            token: newToken
        });
    } catch (error) {
        res.status(401).json({
            success: false,
            message: "Invalid refresh token"
        });
    }
});

// ============ GET CURRENT USER (Protected) ============
router.get("/me", protect, async (req, res) => {
    try {
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                tier: user.tier,
                watchlist: user.watchlist,
                favorites: user.favorites,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Error fetching user"
        });
    }
});

// ============ UPDATE PROFILE (Protected) ============
router.put("/me", protect, async (req, res) => {
    try {
        const { name, avatar, tier } = req.body;
        const user = await User.findById(req.userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (name) user.name = name.trim();
        if (avatar) user.avatar = avatar;
        if (tier && ["FAN", "MEGA FAN", "ULTIMATE FAN"].includes(tier)) {
            user.tier = tier;
        }

        await user.save();

        res.json({
            success: true,
            message: "Profile updated successfully!",
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                avatar: user.avatar,
                tier: user.tier
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Error updating profile"
        });
    }
});

// ============ CHANGE PASSWORD (Protected) ============
router.post("/change-password", protect, async (req, res) => {
    try {
        const { oldPassword, newPassword, confirmPassword } = req.body;

        if (!oldPassword || !newPassword || !confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "All password fields are required"
            });
        }

        if (newPassword.length < 6) {
            return res.status(400).json({
                success: false,
                message: "New password must be at least 6 characters"
            });
        }

        if (newPassword !== confirmPassword) {
            return res.status(400).json({
                success: false,
                message: "New passwords do not match"
            });
        }

        const user = await User.findById(req.userId).select("+password");

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        // Verify old password
        const isCorrect = await user.comparePassword(oldPassword);

        if (!isCorrect) {
            return res.status(401).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        // Update password
        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: "Password changed successfully!"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Error changing password"
        });
    }
});

// ============ LOGOUT (Protected) ============
router.post("/logout", protect, async (req, res) => {
    try {
        const { refreshToken } = req.body;
        const user = await User.findById(req.userId);

        if (user && refreshToken) {
            user.refreshTokens = user.refreshTokens.filter(rt => rt.token !== refreshToken);
            await user.save();
        }

        res.json({
            success: true,
            message: "Logged out successfully!"
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message || "Error logging out"
        });
    }
});

module.exports = router;
