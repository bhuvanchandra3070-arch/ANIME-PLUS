const express = require("express");
const router = express.Router();
const User = require("../user");

// WATCHLIST SYNC
router.post("/watchlist/sync", async (req, res) => {
  try {
    const { userId, watchlist } = req.body;
    if (!userId) {
      return res.json({ success: true, message: "Local session preserved" });
    }

    const user = await User.findById(userId);
    if (user) {
      user.watchlist = watchlist;
      await user.save();
      return res.json({ success: true, watchlist: user.watchlist });
    }
    res.status(404).json({ success: false, message: "User not found" });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
