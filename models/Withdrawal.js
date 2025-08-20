// models/Withdrawal.js
import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  method: { type: String, enum: ["bank", "paypal", "bitcoin", "cashapp"], required: true },
  status: { type: String, enum: ["Pending", "Confirmed", "Rejected"], default: "Pending" },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Withdrawal", withdrawalSchema);
