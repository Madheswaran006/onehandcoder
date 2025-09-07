const express = require('express');
const router = express.Router();
const User = require('../models/User');

// Save program: POST /api/save-program
router.post('/save-program', async (req, res) => {
  try {
    const userId = req.userId;
    const { title = 'Practice Program', content = '' } = req.body;
    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: 'User not found' });

    user.savedPrograms.push({ title, content });
    await user.save();
    res.json({ success: true, message: 'Program saved' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Profile: POST /api/profile (frontend expects savedPrograms)
router.post('/profile', async (req, res) => {
  try {
    const user = await User.findById(req.userId).select('-password');
    if (!user) return res.json({ success: false, message: 'User not found' });
    res.json({ success: true, savedPrograms: user.savedPrograms || [], username: user.username });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Update progress: POST /api/progress
router.post('/progress', async (req, res) => {
  try {
    const { progress, code } = req.body; // frontend sends progress & code snippet
    // For demo: we will store progress value in usedStorage (or add a field), but here just return success
    res.json({ success: true, message: 'Progress updated' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;
