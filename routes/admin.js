const express = require('express');
const router = express.Router();
const User = require('../models/user');

router.get('/users', async (req, res) => {
  try {
    const users = await User.find({ role: 'user' });
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/user/:id', async (req, res) => {
  try {
    const { investmentAmount, profit, totalInterest } = req.body;
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      { investmentAmount, profit, totalInterest },
      { new: true }
    );
    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;