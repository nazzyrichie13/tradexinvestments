import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER, // must be full Gmail
    pass: process.env.EMAIL_PASS  // must be Gmail App Password
  }
});

transporter.verify((error) => {
  if (error) {
    console.error("Error configuring mailer:", error);
  } else {
    console.log("Mailer is ready to send messages");
  }
});

export const send2FACode = async (toEmail, code) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER, // must be the same Gmail user
    to: toEmail,
    subject: "Your 2FA Code",
    html: `<p>Your 2FA code is: <strong>${code}</strong></p>`
  });
};

export const sendMail = async (toEmail, message) => {
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: toEmail,
    subject: "Notification",
    text: message
  });
};

export default transporter;
