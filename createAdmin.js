
require('dotenv').config();
console.log('MONGO_URI from env:', process.env.MONGO_URI);
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

// Define Admin schema
const adminSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }
});

const Admin = mongoose.model('Admin', adminSchema);

// Async function to create admin
async function createAdmin() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI, {
      useUnifiedTopology: true
    });

    const email = 'youngnazzy13@gmail.com'; // Change to your admin email
    const plainPassword = 'chinelo100';      // Your admin password
    const hashedPassword = await bcrypt.hash(plainPassword, 10);

    const admin = new Admin({
      email,
      password: hashedPassword
    });

    await admin.save();
    console.log('✅ Admin created successfully!');
    mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error creating admin:', error.message);
    mongoose.disconnect();
  }
}

// Run the function
createAdmin();
