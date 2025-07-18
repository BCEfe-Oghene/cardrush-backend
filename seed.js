require('dotenv').config();
const mongoose = require('mongoose');

// Define Transaction schema
const transactionSchema = new mongoose.Schema({
  userId: String,
  amount: Number,
  type: String, // e.g., 'deposit' or 'withdrawal'
  status: String, // e.g., 'successful', 'pending', 'failed'
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Transaction = mongoose.model('Transaction', transactionSchema);

// Connect to MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(async () => {
    console.log('✅ Connected to MongoDB');

    // Dummy data
    const sampleTransactions = [
      {
        userId: 'user123',
        amount: 5000,
        type: 'deposit',
        status: 'successful',
      },
      {
        userId: 'user123',
        amount: 2000,
        type: 'withdrawal',
        status: 'pending',
      },
      {
        userId: 'user456',
        amount: 10000,
        type: 'deposit',
        status: 'successful',
      },
    ];

    await Transaction.insertMany(sampleTransactions);
    console.log('✅ Dummy transactions inserted');
    mongoose.disconnect();
  })
  .catch((err) => {
    console.error('❌ MongoDB seed error:', err);
    process.exit(1);
  });
