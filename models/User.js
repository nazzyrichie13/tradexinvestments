// models/User.js

  // other fields for your app
  // models/User.js

import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "user" },
  
  investment: {
    balance: { type: Number, default: 0 },
    profit: { type: Number, default: 0 },
    interest: { type: Number, default: 0 },
  },

  twoFASecret: String,
  acceptedTerms: { type: Boolean, default: false },
});



export default mongoose.model("User", userSchema);
