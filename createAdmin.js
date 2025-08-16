// createAdmin.js
// createAdmin.js
// createAdmin.js
// import mongoose from "mongoose";
// import dotenv from "dotenv";
// import bcrypt from "bcryptjs";
// import Admin from "./models/Admin.js";

// dotenv.config();

// async function main() {
//   try {
//     await mongoose.connect(process.env.MONGO_URI);
//     console.log("✅ MongoDB connected");

//     // Check if admin already exists
//     const existing = await Admin.findOne({ email: "Yankeeplaystore@gmail.com" });
//     if (existing) {
//       console.log("ℹ️ Admin already exists:", existing.email);
//       return;
//     }

//     // Hash password before saving
//     const hashedPassword = await bcrypt.hash("admin123", 10);

//     await Admin.create({
//       name: "Permanent Admin",
//       email: "Yankeeplaystore@gmail.com",
//       password: hashedPassword,
//       role: "admin"
//     });

//     console.log("✅ Permanent admin created: Yankeeplaystore@gmail.com");
//   } catch (err) {
//     console.error("❌ Error:", err);
//   } finally {
//     mongoose.connection.close();
//   }
// }

// main();
