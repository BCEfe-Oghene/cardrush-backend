const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");

router.get("/", auth, (req, res) => {
  res.json({ balance: 1000 }); // mock balance
});

module.exports = router;
