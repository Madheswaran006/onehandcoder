const express = require('express');
const router = express.Router();
const User = require('../models/User');

// GET /api/settings
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.json({ success: false, message: 'User not found' });
    res.json({
      success: true,
      username: user.username,
      email: user.email,
      subscription: user.subscription,
      usedStorage: user.usedStorage,
      maxStorage: user.maxStorage
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/settings/update
router.post('/update', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const user = await User.findById(req.userId);
    if (!user) return res.json({ success: false, message: 'User not found' });
    if (username) user.username = username;
    if (email) user.email = email;
    if (password) {
      const bcrypt = require('bcryptjs');
      user.password = await bcrypt.hash(password, 10);
    }
    await user.save();
    res.json({ success: true, message: 'Settings updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// POST /api/settings/reset-progress
router.post('/reset-progress', async (req, res) => {
  try {
    // Resetting user's progress: for demo, clear savedPrograms and usedStorage
    const user = await User.findById(req.userId);
    if (!user) return res.json({ success: false, message: 'User not found' });
    user.savedPrograms = [];
    user.usedStorage = 0;
    await user.save();
    res.json({ success: true, message: 'Progress reset' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
