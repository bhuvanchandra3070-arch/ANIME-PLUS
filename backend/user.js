const mongoose = require("mongoose");
const bcryptjs = require("bcryptjs");

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: [true, "Please provide a name"],
            trim: true,
            minlength: [2, "Name must be at least 2 characters"]
        },

        email: {
            type: String,
            required: [true, "Please provide an email"],
            unique: true,
            lowercase: true,
            trim: true
        },

        phone: {
            type: String,
            trim: true,
            sparse: true
        },

        password: {
            type: String,
            minlength: [6, "Password must be at least 6 characters"],
            select: false
        },

        otp: {
            code: String,
            expiresAt: Date,
            type: String,
            target: String
        },

        avatar: {
            type: String,
            default: "https://images.unsplash.com/photo-1578632767115-351597cf2477?w=160&auto=format&fit=crop&q=80"
        },

        tier: {
            type: String,
            enum: ["FAN", "MEGA FAN", "ULTIMATE FAN"],
            default: "FAN"
        },

        favorites: {
            type: [String],
            default: []
        },

        watchlist: {
            type: [String],
            default: []
        },

        watchHistory: [
            {
                animeId: String,
                episodeId: String,
                watchedAt: {
                    type: Date,
                    default: Date.now
                },
                progress: Number
            }
        ],

        isEmailVerified: {
            type: Boolean,
            default: false
        },

        lastLogin: Date,

        refreshTokens: [
            {
                token: String,
                expiresAt: Date
            }
        ]
    },

    {
        timestamps: true
    }
);

// Hash password before saving
userSchema.pre("save", async function(next) {
    if (!this.isModified("password")) return next();

    try {
        const salt = await bcryptjs.genSalt(10);
        this.password = await bcryptjs.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(enteredPassword) {
    return await bcryptjs.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", userSchema);