
    require('dotenv').config();
const mongoose = require('mongoose');
const Admin = require('./models/Admin');  // Correct relative path

async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    const email = 'youngnazzy13@gmai.com';
    const password = 'loveisgood100';

    console.log(`Checking if admin with email ${email} exists...`);
    const existingAdmin = await Admin.findOne({ email });
    if (existingAdmin) {
      console.log('Admin user already exists!');
      process.exit(0);
    }

    console.log('Creating new admin user...');
    const admin = new Admin({ email, password }); // plain password, hashing done in model
    await admin.save();
    console.log('Admin user created successfully!');

    process.exit(0);
  } catch (error) {
    console.error('Error creating admin:', error);
    process.exit(1);
  }
}

createAdmin();
