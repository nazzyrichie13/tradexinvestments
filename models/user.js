// models/User.js
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  fullName: { type: String },
  profilePhoto: { type: String, default: '' },

  // 2FA fields
  twoFA: {
    secret: { type: String, default: null }, // store base32 secret
    enabled: { type: Boolean, default: false } // has2FA
  },

  // other fields for your app
  investmentAmount: { type: Number, default: 0 },
  profit: { type: Number, default: 0 },
  totalInterest: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
