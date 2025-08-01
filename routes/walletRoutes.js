const express = require('express');
const router = express.Router();
const verifyToken = require('../middleware/auth');
const User = require('./User');
const axios = require('axios');

// POST /api/wallet/deposit (Manual)
router.post('/deposit', verifyToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid deposit amount' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    user.balance += amount;
    user.transactions.push({ type: 'deposit', amount, date: new Date() });
    await user.save();

    res.status(200).json({ message: 'Deposit successful', balance: user.balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/wallet/withdraw
router.post('/withdraw', verifyToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) {
    return res.status(400).json({ message: 'Invalid withdraw amount' });
  }

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (user.balance < amount) {
      return res.status(400).json({ message: 'Insufficient balance' });
    }

    user.balance -= amount;
    user.transactions.push({ type: 'withdrawal', amount, date: new Date() });
    await user.save();

    res.status(200).json({ message: 'Withdrawal successful', balance: user.balance });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST /api/wallet/verify-payment (Paystack)
router.post('/verify-payment', verifyToken, async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ message: 'Missing payment reference' });

  try {
    const response = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
      headers: {
        Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      },
    });

    const { status, amount } = response.data.data;

    if (status === 'success') {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const credit = amount / 100;
      user.balance += credit;
      user.transactions.push({ type: 'deposit', amount: credit, date: new Date() });
      await user.save();

      return res.status(200).json({
        message: 'Payment verified and balance updated',
        balance: user.balance,
      });
    } else {
      return res.status(400).json({ message: 'Payment was not successful' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Payment verification failed', error: error.message });
  }
});

// POST /api/wallet/verify-flw (Flutterwave)
router.post('/verify-flw', verifyToken, async (req, res) => {
  const { tx_ref } = req.body;
  if (!tx_ref) return res.status(400).json({ message: 'Missing Flutterwave reference' });

  try {
    const response = await axios.get(`${process.env.FLW_BASE_URL}/transactions/verify_by_reference?tx_ref=${tx_ref}`, {
      headers: {
        Authorization: `Bearer ${process.env.FLW_SECRET_KEY}`,
      },
    });

    const { status, amount, currency } = response.data.data;
    if (status === 'successful') {
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ message: 'User not found' });

      const credit = amount;
      user.balance += credit;
      user.transactions.push({ type: 'deposit', amount: credit, date: new Date() });
      await user.save();

      return res.status(200).json({ message: 'Flutterwave payment verified', balance: user.balance });
    } else {
      return res.status(400).json({ message: 'Payment was not successful' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Flutterwave verification failed', error: error.message });
  }
});

// GET /api/wallet/history
router.get('/history', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('transactions');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const history = (user.transactions || []).reverse();
    res.status(200).json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
