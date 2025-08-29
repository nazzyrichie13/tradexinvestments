
import nodemailer from "nodemailer";
import dotenv from "dotenv";
dotenv.config();

// Create transporter using SendGrid
const transporter = nodemailer.createTransport({
  service: "SendGrid",
  auth: {
    user: "apikey", // <-- must be literally "apikey"
    pass: process.env.SENDGRID_API_KEY
  }
});

// Verify connection
transporter.verify((error) => {
  if (error) {
    console.error("Error configuring mailer:", error);
  } else {
    console.log("Mailer is ready to send emails!");
  }
});

// Example function to send email
export async function sendEmail(to, subject, text) {
  try {
    const info = await transporter.sendMail({
      from: '"Your App" <no-reply@yourdomain.com>', // must be verified sender in SendGrid
      to,
      subject,
      text
    });

    console.log("Email sent:", info.messageId);
    return info;
  } catch (err) {
    console.error("Error sending email:", err);
    throw err;
  }
}


export default transporter;
