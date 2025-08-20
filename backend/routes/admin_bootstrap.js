const express = require('express');
const User = require('../models/User');

const router = express.Router();

// POST /api/admin/bootstrap
// Body: { name, email, password, phone, token }
// Only allowed if no admin exists and token matches ADMIN_BOOTSTRAP_TOKEN
router.post('/', async (req, res) => {
  try {
    const { name, email, password, phone, token } = req.body || {};

    if (!process.env.ADMIN_BOOTSTRAP_TOKEN) {
      return res.status(500).json({ message: 'Server not configured for admin bootstrap.' });
    }

    if (!token || token !== process.env.ADMIN_BOOTSTRAP_TOKEN) {
      return res.status(401).json({ message: 'Invalid bootstrap token.' });
    }

    const existingAdmin = await User.findOne({ role: 'admin' });
    if (existingAdmin) {
      return res.status(403).json({ message: 'Admin already exists.' });
    }

    if (!name || !email || !password || !phone) {
      return res.status(400).json({ message: 'name, email, password, phone are required.' });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists.' });
    }

    const admin = new User({ name, email, password, phone, role: 'admin' });
    await admin.save();

    return res.json({
      message: 'Admin created successfully.',
      admin: { id: admin._id, name: admin.name, email: admin.email, role: admin.role }
    });
  } catch (err) {
    console.error('Admin bootstrap error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;


