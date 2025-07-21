import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import cors from "cors";
import connectDB from "./config/db.js";

import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import walletRoutes from "./routes/walletRoutes.js";
import webhookRoutes from "./routes/webhookRoutes.js";

dotenv.config();
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection fallback (optional if using connectDB())
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch((err) => console.error('❌ MongoDB Connection Failed:', err.message));

// Middleware
app.use(cors());
app.use(express.json());
app.use('/api/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use('/api/wallet/webhook/paystack', express.raw({ type: '*/*' }));
app.use('/api/wallet/webhook/flutterwave', express.raw({ type: '*/*' }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/webhook", webhookRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('CardRush API is running');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
