
import sgMail from "@sendgrid/mail";
import dotenv from "dotenv";

dotenv.config();

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Function to send 2FA code
export const send2FACode = async (toEmail, code) => {
  const msg = {
    to: toEmail,
    from: "support@tradexinvest.net", // Your verified sender in SendGrid
    subject: "Your 2FA Code",
    html: `<p>Your 2FA code is: <strong>${code}</strong></p>`,
  };

  try {
    await sgMail.send(msg);
    console.log("2FA email sent to", toEmail);
  } catch (error) {
    console.error("Error sending 2FA email:", error);
  }
};

// Function to send general notifications
export const sendMail = async (toEmail, message) => {
  const msg = {
    to: toEmail,
    from: "support@tradexinvest.net", // same verified sender
    subject: "Notification",
    text: message,
  };

  try {
    await sgMail.send(msg);
    console.log("Notification sent to", toEmail);
  } catch (error) {
    console.error("Error sending email:", error);
  }
};

export default sgMail;
