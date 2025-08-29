import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER, // must be full Gmail address
    pass: process.env.EMAIL_PASS  // must be Gmail App Password
  }
});

// Verify transporter
transporter.verify((error) => {
  if (error) {
    console.error("Error configuring mailer:", error);
  } else {
    console.log("Mailer is ready to send messages");
  }
});

// Send 2FA code
export const send2FACode = async (toEmail, code) => {
  await transporter.sendMail({
    from: `"Support Team" <${process.env.EMAIL_USER}>`, // must be valid email
    to: toEmail,
    subject: "Your 2FA Code",
    html: `<p>Your 2FA code is: <strong>${code}</strong></p>`
  });
};

// Generic email
export const sendMail = async (toEmail, message) => {
  await transporter.sendMail({
    from: `"Support Team" <${process.env.EMAIL_USER}>`,
    to: toEmail,
    subject: "Notification",
    text: message
  });
};

export default transporter;
