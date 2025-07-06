// routes/auth.js
const express = require('express');
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// REGISTER
// REGISTER route
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const existing = await User.findOne({ $or: [ { username }, { email } ] });
    if (existing) {
      return res.status(400).json({
        message: existing.username === username
          ? "Username already taken"
          : "Email already registered"
      });
    }

    const hash = await bcrypt.hash(password, 10);
    const newUser = new User({ username, email, password: hash });
    await newUser.save();
    res.status(201).json({ message: "User registered successfully" });
  } catch (e) {
    if (e.name === 'MongoError' && e.code === 11000) {
      return res.status(400).json({ message: "User already exists" });
    }
    res.status(500).json({ error: e.message });
  }
});
