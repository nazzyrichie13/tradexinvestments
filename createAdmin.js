
// createAdmin.js
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from './models/Admin.js'; // Adjust path if your Admin model is elsewhere

dotenv.config();

if (!process.env.MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in .env');
  process.exit(1);
}

(async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected');

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email: process.env.ADMIN_EMAIL });
    if (existingAdmin) {
      console.log('⚠️ Admin already exists:', existingAdmin.email);
      process.exit(0);
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASS, 10);

    // Create admin
    const newAdmin = await Admin.create({
      email: process.env.ADMIN_EMAIL,
      password: hashedPassword
    });

    console.log('✅ Admin created:', newAdmin.email);
    process.exit(0);

  } catch (err) {
    console.error('❌ Error creating admin:', err);
    process.exit(1);
  }
})();
