import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

async function testSend() {
  try {
    await sgMail.send({
      to: process.env.ADMIN_EMAIL,         // Your email to receive test
      from: process.env.EMAIL_USER,        // Verified sender in SendGrid
      subject: "SendGrid Test Email",
      text: "This is a test email from your app!",
    });
    console.log("✅ Email sent successfully!");
  } catch (error) {
    console.error("❌ Error sending email:", error.response?.body || error);
  }
}

testSend();
