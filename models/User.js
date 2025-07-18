const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email:    { type: String, required: true, unique: true },
  password: { type: String, required: true },
  balance:  { type: Number, default: 0 },
  role:     { type: String, default: 'user' },
transactions: [
  {
    type: { type: String, enum: ['deposit', 'withdrawal'], required: true },
    amount: { type: Number, required: true },
    date: { type: Date, default: Date.now },
  }
]
});

module.exports = mongoose.model('User', UserSchema);
