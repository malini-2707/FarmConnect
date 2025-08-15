const User = require('../models/User');

// Admin check middleware that works with existing auth middleware
// - If req.userDoc exists, use it
// - Otherwise, use req.user.userId from JWT payload to fetch user
module.exports = async (req, res, next) => {
  try {
    // Prefer full user document if already loaded by auth
    if (req.userDoc) {
      if (req.userDoc.role === 'admin') return next();
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Fallback: load user by ID from token payload
    const userId = req.user?.userId || req.user?._id || req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'No authenticated user found.' });
    }

    const user = await User.findById(userId).select('role');
    if (!user) {
      return res.status(401).json({ message: 'Invalid user.' });
    }

    if (user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
    }

    // Make user doc available to downstream handlers
    req.userDoc = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Unauthorized.' });
  }
};


