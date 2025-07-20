const express = require('express');
const router = express.Router();
const axios = require('axios');
const verifyToken = require('../middleware/auth');
const User = require('../models/User');

// Deposit (manual, for testing)
router.post('/deposit', verifyToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  user.balance += amount;
  user.transactions.push({ type: 'deposit', amount, date: new Date() });
  await user.save();

  res.json({ message: 'Deposit successful', balance: user.balance });
});

// Withdraw
router.post('/withdraw', verifyToken, async (req, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ message: 'Invalid amount' });

  const user = await User.findById(req.user.id);
  if (!user) return res.status(404).json({ message: 'User not found' });

  if (user.balance < amount) return res.status(400).json({ message: 'Insufficient balance' });

  user.balance -= amount;
  user.transactions.push({ type: 'withdrawal', amount, date: new Date() });
  await user.save();

  res.json({ message: 'Withdrawal successful', balance: user.balance });
});

// Verify Paystack
router.post('/verify-payment', verifyToken, async (req, res) => {
  const { reference, method } = req.body;
  if (!reference) return res.status(400).json({ message: 'Missing reference' });

  try {
    let verified = false;
    let amount = 0;

    if (method === 'flutterwave') {
      const fwRes = await axios.get(`https://api.flutterwave.com/v3/transactions/verify_by_reference?tx_ref=${reference}`, {
        headers: { Authorization: `Bearer ${process.env.FLW_SECRET_KEY}` },
      });
      const data = fwRes.data.data;
      if (data.status === 'successful') {
        verified = true;
        amount = data.amount;
      }
    } else {
      const psRes = await axios.get(`https://api.paystack.co/transaction/verify/${reference}`, {
        headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
      });
      const data = psRes.data.data;
      if (data.status === 'success') {
        verified = true;
        amount = data.amount / 100;
      }
    }

    if (verified) {
      const user = await User.findById(req.user.id);
      user.balance += amount;
      user.transactions.push({ type: 'deposit', amount, date: new Date() });
      await user.save();

      return res.json({ message: 'Verified and wallet updated', balance: user.balance });
    } else {
      return res.status(400).json({ message: 'Verification failed' });
    }
  } catch (err) {
    return res.status(500).json({ message: err.message });
  }
});

// Webhooks
router.post('/webhook/paystack', async (req, res) => {
  const { event, data } = req.body;
  if (event !== 'charge.success') return res.sendStatus(400);

  const reference = data.reference;
  const email = data.customer.email;
  const amount = data.amount / 100;

  const user = await User.findOne({ email });
  if (user) {
    user.balance += amount;
    user.transactions.push({ type: 'deposit', amount, date: new Date(), ref: reference });
    await user.save();
  }

  res.sendStatus(200);
});

router.post('/webhook/flutterwave', async (req, res) => {
  const { event, data } = req.body;
  if (event !== 'charge.completed') return res.sendStatus(400);

  const reference = data.tx_ref;
  const email = data.customer.email;
  const amount = data.amount;

  const user = await User.findOne({ email });
  if (user) {
    user.balance += amount;
    user.transactions.push({ type: 'deposit', amount, date: new Date(), ref: reference });
    await user.save();
  }

  res.sendStatus(200);
});

// History
router.get('/history', verifyToken, async (req, res) => {
  const user = await User.findById(req.user.id).select('transactions');
  if (!user) return res.status(404).json({ message: 'User not found' });
  res.json(user.transactions.reverse());
});

module.exports = router;

