const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['deposit', 'withdrawal'],
    required: true,
  },
  amount: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  reference: String,
  status: {
    type: String,
    enum: ['pending', 'success', 'failed'],
    default: 'success',
  },
  provider: {
    type: String,
    enum: ['paystack', 'flutterwave', 'manual'],
    default: 'manual',
  },
});

const walletSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  balance: {
    type: Number,
    default: 0,
  },
  transactions: [transactionSchema],
});

module.exports = mongoose.model('Wallet', walletSchema);

