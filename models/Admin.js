

import mongoose from "mongoose";

const adminSchema = new mongoose.Schema({
  name: { type: String, default: "Admin" },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, default: "admin" },
  twoFASecret: String,
});

export default mongoose.model("Admin", adminSchema);
