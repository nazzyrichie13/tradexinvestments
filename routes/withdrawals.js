const express = require("express");
const WithdrawalRequest = require("../models/withdrawalRequest");
const User = require("../models/user");
const authMiddleware = require("../middleware/authMiddleware");
const rateLimit = require("express-rate-limit");
const transporter = require("../utils/mailer");

const router = express.Router();

// Rate limiter: max 2 withdrawal requests per user per day
const withdrawLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 2,
  keyGenerator: (req) => req.user.id,  // rate limit by user id
  message: "You have reached the maximum number of withdrawal requests allowed per day."
});

// Submit a withdrawal request
router.post("/", authMiddleware, withdrawLimiter, async (req, res) => {
  try {
    const { amount, method, recipientDetails } = req.body;
    const userId = req.user.id;

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Invalid withdrawal amount." });
    }

    // Validate method
    const validMethods = ["paypal", "cashapp", "bank", "crypto", "wise"];
    if (!validMethods.includes(method)) {
      return res.status(400).json({ message: "Invalid withdrawal method." });
    }
    if (!recipientDetails) {
      return res.status(400).json({ message: "Recipient details required." });
    }

    // Check user investment balance
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found." });

    if ((user.investmentAmount || 0) < amount) {
      return res.status(400).json({ message: "Insufficient balance for withdrawal." });
    }

    // Create withdrawal request
    const newRequest = new WithdrawalRequest({
      userId,
      amount,
      method,
      recipientDetails,
    });
    await newRequest.save();

    // Optionally, you can notify admin by email here if you want

    res.status(201).json({ message: "Withdrawal request submitted.", request: newRequest });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});

// Get withdrawal history for logged-in user
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await WithdrawalRequest.find({ userId }).sort({ createdAt: -1 });
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error." });
  }
});
// Admin-only middleware check
function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Access denied' });
  next();
}

// Get all withdrawal requests (admin view)
router.get('/admin/requests', authMiddleware, adminOnly, async (req, res) => {
  try {
    const requests = await WithdrawalRequest.find()
      .populate('userId', 'email fullName investmentAmount')
      .sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Approve or reject a withdrawal request (admin)
router.put('/admin/request/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { status } = req.body; // 'approved' or 'rejected'
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status' });
    }

    const request = await WithdrawalRequest.findById(req.params.id).populate('userId');
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status && request.status !== 'pending') {
      return res.status(400).json({ message: 'Request already processed' });
    }

    request.status = status;
    request.updatedAt = new Date();
    await request.save();

    // Optional: update user investment amount if approved
    if (status === 'approved') {
      request.userId.investmentAmount -= request.amount;
      await request.userId.save();
    }

    // Send email notification to user
    const subject = `Your withdrawal request has been ${status}`;
    const html = `
      <p>Hello ${request.userId.fullName || 'Investor'},</p>
      <p>Your withdrawal request of $${request.amount} via ${request.method} has been <strong>${status}</strong>.</p>
      ${status === 'approved' ? '<p>The funds will be sent to your recipient details shortly.</p>' : '<p>If you have questions, please contact support.</p>'}
      <p>Thank you for using TradexInvest.</p>
    `;

    transporter.sendMail({
      from: '"TradexInvest Support" <support@tradexinvest.com>',
      to: request.userId.email,
      subject,
      html,
    }, (error, info) => {
      if (error) console.error('Error sending withdrawal email:', error);
      else console.log('Withdrawal email sent:', info.response);
    });

    res.json({ message: `Withdrawal request ${status}`, request });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});


module.exports = router;
