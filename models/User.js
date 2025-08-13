// models/User.js

  // other fields for your app
  // models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: String,
  photo: String,
  twoFACode: String,
  twoFAExpires: Date // new field for code expiration
});

const User = mongoose.model("User", userSchema);
export default User;
