import mongoose from "mongoose";

const transactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["deposit", "withdrawal"], required: true },
    amount: { type: Number, required: true },
    method: { 
      type: String, 
      enum: ["paypal", "bitcoin", "cashapp", "bank-to-bank"], 
      required: true 
    },
    status: { 
      type: String, 
      enum: ["pending", "success", "failed"], 
      default: "pending" 
    },
    note: { type: String }, // optional message for admin decision
  },
  { timestamps: true }
);

const Transaction = mongoose.model("Transaction", transactionSchema);
export default Transaction;
