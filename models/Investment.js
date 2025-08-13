import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    principal: { type: Number, required: true },
    profit: { type: Number, default: 0 },
    status: { type: String, enum: ["active", "closed"], default: "active" }
  },
  { timestamps: true }
);

const Investment = mongoose.model("Investment", investmentSchema);
export default Investment;
