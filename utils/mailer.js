const transporter = require("../config/mailer");

router.post("/", async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    await transporter.sendMail({
      from: `"TradexInvest Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_RECEIVER || process.env.EMAIL_USER,
      subject: "New Contact Form Submission",
      html: `
        <h3>Contact Form Submission</h3>
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Message:</strong> ${message}</p>
      `,
    });

    res.json({ message: "Message sent successfully!" });
  } catch (err) {
    console.error("Send email error:", err);
    res.status(500).json({ message: "Error sending message" });
  }
});

