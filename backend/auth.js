const jwt = require("jsonwebtoken");
const { requiredSecret } = require("./config/secrets");

const JWT_SECRET = requiredSecret("JWT_SECRET");

const protect = (req, res, next) => {
    try {
        const header = req.headers.authorization;

        if (!header || !header.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required. Please provide a valid token."
            });
        }

        const token = header.split(" ")[1];

        const decoded = jwt.verify(
            token,
            JWT_SECRET
        );

        req.userId = decoded.userId;
        next();

    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({
                success: false,
                message: "Token expired. Please refresh your token."
            });
        }

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token"
        });
    }
};

module.exports = protect;

