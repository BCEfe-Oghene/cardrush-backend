// controllers/walletController.js
const axios = require('axios');
const User = require('../models/User');
const Transaction = require('../models/Transaction');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const FLW_SECRET = process.env.FLW_SECRET_KEY;

exports.deposit = async (req, res) => {
  const { amount, method } = req.body;
  const userId = req.user.id;

  if (!amount || amount < 100) return res.status(400).json({ message: 'Minimum deposit is ₦100' });

  try {
    if (method === 'paystack') {
      const response = await axios.post(
        'https://api.paystack.co/transaction/initialize',
        { amount: amount * 100, email: req.user.email, callback_url: `${process.env.CLIENT_URL}/wallet` },
        { headers: { Authorization: `Bearer ${PAYSTACK_SECRET}` } }
      );
      return res.json({ authorization_url: response.data.data.authorization_url });
    }

    if (method === 'flutterwave') {
      const payload = {
        tx_ref: `flw-${Date.now()}`,
        amount,
        currency: 'NGN',
        redirect_url: `${process.env.CLIENT_URL}/wallet`,
        payment_options: 'card,banktransfer',
        customer: {
          email: req.user.email,
          name: req.user.name,
        },
        customizations: {
          title: 'CardRush Wallet Deposit',
          logo: 'https://cardrush.vercel.app/logo.png',
        },
      };

      const response = await axios.post(
        'https://api.flutterwave.com/v3/payments',
        payload,
        { headers: { Authorization: `Bearer ${FLW_SECRET}` } }
      );

      return res.json({ authorization_url: response.data.data.link });
    }

    return res.status(400).json({ message: 'Invalid payment method' });
  } catch (error) {
    console.error('Deposit init failed:', error.message);
    return res.status(500).json({ message: 'Deposit failed' });
  }
};

exports.withdraw = async (req, res) => {
  const { amount, bankCode, accountNumber } = req.body;
  const userId = req.user.id;

  try {
    const user = await User.findById(userId);

    if (user.wallet < amount) return res.status(400).json({ message: 'Insufficient balance' });

    // TODO: (Manual Approval) Store withdrawal request
    await Transaction.create({ user: userId, amount, type: 'withdraw', status: 'pending' });

    user.wallet -= amount;
    await user.save();

    res.json({ message: 'Withdrawal request submitted' });
  } catch (err) {
    res.status(500).json({ message: 'Withdraw failed' });
  }
};

// PAYSTACK WEBHOOK
exports.verifyPaystackWebhook = async (req, res) => {
  try {
    const event = req.body;

    if (event.event === 'charge.success') {
      const email = event.data.customer.email;
      const amount = event.data.amount / 100;

      const user = await User.findOne({ email });
      if (!user) return res.sendStatus(404);

      user.wallet += amount;
      await user.save();

      await Transaction.create({
        user: user._id,
        amount,
        type: 'deposit',
        method: 'paystack',
        status: 'success',
        reference: event.data.reference,
      });

      return res.sendStatus(200);
    }

    res.sendStatus(400);
  } catch (err) {
    console.error('Paystack webhook error:', err.message);
    res.sendStatus(500);
  }
};

// FLUTTERWAVE WEBHOOK
exports.verifyFlutterwaveWebhook = async (req, res) => {
  try {
    const flwSig = req.headers['verif-hash'];
    if (!flwSig || flwSig !== process.env.FLW_SECRET_HASH) {
      return res.sendStatus(401);
    }

    const event = req.body;
    if (event.event === 'charge.completed' && event.data.status === 'successful') {
      const email = event.data.customer.email;
      const amount = event.data.amount;

      const user = await User.findOne({ email });
      if (!user) return res.sendStatus(404);

      user.wallet += amount;
      await user.save();

      await Transaction.create({
        user: user._id,
        amount,
        type: 'deposit',
        method: 'flutterwave',
        status: 'success',
        reference: event.data.tx_ref,
      });

      return res.sendStatus(200);
    }

    res.sendStatus(400);
  } catch (err) {
    console.error('Flutterwave webhook error:', err.message);
    res.sendStatus(500);
  }
};

