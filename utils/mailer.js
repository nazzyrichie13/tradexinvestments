const nodemailer = require('nodemailer');

// Create transporter with your email service credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., Gmail
  auth: {
    user: 'your.email@gmail.com',       // your email address
    pass: 'your-email-app-password'     // app password or real password if less secure apps allowed
  }
});

// Verify connection configuration (optional but useful)
transporter.verify(function(error, success) {
  if (error) {
    console.error('Error configuring mailer:', error);
  } else {
    console.log('Mailer is ready to send messages');
  }
});

module.exports = transporter;
