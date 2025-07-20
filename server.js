const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const walletRoutes = require('./models/wallet');
const bodyParser = require('body-parser');
const webhookRoutes = require('./routes/webhookRoutes');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB Connected Successfully'))
.catch((err) => console.error('❌ MongoDB Connection Failed:', err.message));

// Middleware (if needed)
app.use('/api/webhook', express.json({ verify: (req, res, buf) => { req.rawBody = buf; } }));
app.use('/api/wallet/webhook/paystack', express.raw({ type: '*/*' }));
app.use('/api/wallet/webhook/flutterwave', express.raw({ type: '*/*' }));
app.use(express.json());
app.use('/api/wallet', walletRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/webhook', webhookRoutes);
app.use('/api/wallet', require('./routes/wallet'));

// Sample route
app.get('/', (req, res) => {
  res.send('CardRush API is running');
});

// Start the server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
