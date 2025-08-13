import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();


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
export const send2FACode = async (toEmail, code) => {
  await transporter.sendMail({
    from: `"TradexInvest" <${process.env.SMTP_USER}>`,
    to: toEmail,
    subject: "Your 2FA Code",
    html: `<p>Your 2FA code is: <strong>${code}</strong></p>`
  });
};

module.exports = transporter;
