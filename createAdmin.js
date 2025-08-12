require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./Admin');

async function createAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    // Change these values to your desired admin credentials
    const email = 'admin@example.com';
    const password = 'yourStrongPassword123';

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      return process.exit(0);
    }

    // Create new admin user
    const admin = new Admin({ email, password });
    await admin.save();
    console.log('Admin user created successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
