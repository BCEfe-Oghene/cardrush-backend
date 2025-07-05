const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

router.get("/stats", auth, (req, res) => {
  res.json({ revenue: 50000, users: 120 }); // mock data
});

module.exports = router;
