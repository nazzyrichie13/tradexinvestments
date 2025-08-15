import mongoose from "mongoose";

const depositSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    method: { type: String, enum: ["paypal", "bitcoin", "cashapp", "bank"], required: true },
    amount: { type: Number, required: true, min: 1 },
    status: { type: String, enum: ["pending", "confirmed", "failed"], default: "pending" },
    transactionId: { type: String } // Optional: for payment gateway tracking
  },
  { timestamps: true }
);

const Deposit = mongoose.model("Deposit", depositSchema);
export default Deposit;
