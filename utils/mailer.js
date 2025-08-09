const nodemailer = require('nodemailer');

// Create transporter with your email service credentials
const transporter = nodemailer.createTransport({
  service: 'gmail', // e.g., Gmail
  auth: {
    user: 'youngnazzy13@gmail.com',       // your email address
    pass: 'lslg hodt hohk mwli'     // app password or real password if less secure apps allowed
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
