const windows = new Map();

function rateLimit({ limit, windowMs, key = (req) => req.ip }) {
    return (req, res, next) => {
        const now = Date.now();
        const id = `${req.baseUrl}${req.path}:${key(req)}`;
        let entry = windows.get(id);

        if (!entry || now >= entry.resetAt) {
            entry = { count: 0, resetAt: now + windowMs };
            windows.set(id, entry);
        }

        entry.count += 1;
        res.set("RateLimit-Limit", String(limit));
        res.set("RateLimit-Remaining", String(Math.max(0, limit - entry.count)));
        res.set("RateLimit-Reset", String(Math.ceil((entry.resetAt - now) / 1000)));

        if (windows.size > 5000) {
            for (const [windowId, value] of windows) {
                if (now >= value.resetAt) windows.delete(windowId);
            }
        }

        if (entry.count > limit) {
            return res.status(429).json({ success: false, message: "Too many requests. Please wait and try again." });
        }
        next();
    };
}

module.exports = rateLimit;
