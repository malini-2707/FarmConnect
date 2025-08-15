const roleAuth = (allowedRoles) => {
  return (req, res, next) => {
    try {
      // Check if user exists and has role
      if (!req.user || !req.user.role) {
        return res.status(401).json({ message: 'Access denied. User not authenticated.' });
      }

      // Check if user's role is allowed
      if (!allowedRoles.includes(req.user.role)) {
        return res.status(403).json({ 
          message: 'Access denied. Insufficient permissions.',
          requiredRoles: allowedRoles,
          userRole: req.user.role
        });
      }

      next();
    } catch (error) {
      console.error('Role authentication error:', error);
      res.status(500).json({ message: 'Server error during role authentication' });
    }
  };
};

module.exports = roleAuth;
