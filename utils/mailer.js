const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,       // Your email address from environment
    pass: process.env.EMAIL_PASS        // Your app password or real password from environment
  }
});

transporter.verify((error, success) => {
  if (error) {
    console.error('Error configuring mailer:', error);
  } else {
    console.log('Mailer is ready to send messages');
  }
});

module.exports = transporter;
