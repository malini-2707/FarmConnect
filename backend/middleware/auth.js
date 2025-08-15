const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback_secret');

    // Normalize payload to { id, role }
    let userId = decoded?.user?.id || decoded?.id || decoded?.userId;
    let role = decoded?.user?.role || decoded?.role;

    if (!userId) {
      return res.status(401).json({ message: 'Token payload invalid' });
    }

    req.user = { id: userId, role };
    
    // Optionally fetch full user data
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }
    
    req.userDoc = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = auth;
