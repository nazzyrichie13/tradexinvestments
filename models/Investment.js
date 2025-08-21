import mongoose from "mongoose";

const investmentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  email: { type: String, required: true, unique: true },
  investments: [
    {
      amount: { type: Number, required: true },
      method: { type: String, required: true },
      date: { type: Date, default: Date.now }
    }
  ],
  
});

export default mongoose.model("Investment", investmentSchema);
