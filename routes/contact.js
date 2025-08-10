const express = require("express");
const nodemailer = require("nodemailer");

const router = express.Router();

router.post("/", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    // Validate inputs
    if (!name || !email || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // Configure Nodemailer transport
    const transporter = nodemailer.createTransport({
      service: "gmail", // You can use Outlook, Yahoo, etc.
      auth: {
        user: process.env.EMAIL_USER, // Your email address
        pass: process.env.EMAIL_PASS, // Your email password or app password
      },
    });

    // Email content
    const mailOptions = {
      from: `"TradexInvest Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEIVER || process.env.EMAIL_USER, // Where to receive messages
      subject: "New Contact Form Submission",
      html: `
        <h3>New Message from Contact Form</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong></p>
        <p>${message}</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);

    res.json({ message: "Your message has been sent successfully!" });
  } catch (err) {
    console.error("Contact form error:", err);
    res.status(500).json({ message: "Failed to send message. Please try again later." });
  }
});

module.exports = router;
