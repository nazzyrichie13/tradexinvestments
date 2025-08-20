import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  method: { type: String, required: true }, // e.g. "Bank Transfer", "Bitcoin", "PayPal"
  paymentDate: { type: Date, required: true }, // admin can backdate manually
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("Investment", investmentSchema);
