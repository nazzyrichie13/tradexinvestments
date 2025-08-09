const express = require('express');
const multer = require('multer');
const path = require('path');
const User = require('../models/user');
const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
});

const upload = multer({ storage });

router.post('/upload-profile/:userId', upload.single('profilePhoto'), async (req, res) => {
  try {
    const userId = req.params.userId;
    const profilePhotoPath = `/uploads/${req.file.filename}`;
    const updatedUser = await User.findByIdAndUpdate(userId, { profilePhoto: profilePhotoPath }, { new: true });
    res.json({ message: 'Profile photo updated', user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: 'Error uploading file' });
  }
});

module.exports = router;