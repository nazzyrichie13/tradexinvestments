// testAdminLogin.js
import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import Admin from "./models/Admin.js";

dotenv.config();

const emailToTest = "Yankeeplaystore@gmail.com"; // your admin email
const passwordToTest = "admin123";               // the plain password you think is correct

async function testLogin() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ MongoDB connected");

    // find admin by email
    const admin = await Admin.findOne({ email: emailToTest });
    if (!admin) {
      console.log("❌ Admin not found in database");
      return;
    }

    console.log("Admin found:", admin.email);

    // check password
    const isMatch = await bcrypt.compare(passwordToTest, admin.password);
    if (isMatch) {
      console.log("✅ Password matches! Login should work");
    } else {
      console.log("❌ Password does NOT match! Check what was hashed in DB");
    }
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
  }
}

testLogin();
