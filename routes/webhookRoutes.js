const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Paystack Webhook
router.post('/paystack', async (req, res) => {
  const event = req.body;

  if (event.event === 'charge.success') {
    const reference = event.data.reference;
    const email = event.data.customer.email;
    const amount = event.data.amount / 100;

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).end();

      user.balance += amount;
      user.transactions.push({
        type: 'deposit',
        amount,
        date: new Date(),
        reference,
        provider: 'paystack',
        status: 'success',
      });

      await user.save();
      return res.sendStatus(200);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.sendStatus(200);
});

// Flutterwave Webhook
router.post('/flutterwave', async (req, res) => {
  const secretHash = process.env.FLW_SECRET_HASH;
  const signature = req.headers['verif-hash'];

  if (!signature || signature !== secretHash) return res.sendStatus(401);

  const payload = req.body;

  if (payload.event === 'charge.completed' && payload.data.status === 'successful') {
    const reference = payload.data.tx_ref;
    const email = payload.data.customer.email;
    const amount = parseFloat(payload.data.amount);

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).end();

      user.balance += amount;
      user.transactions.push({
        type: 'deposit',
        amount,
        date: new Date(),
        reference,
        provider: 'flutterwave',
        status: 'success',
      });

      await user.save();
      return res.sendStatus(200);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  res.sendStatus(200);
});

module.exports = router;
