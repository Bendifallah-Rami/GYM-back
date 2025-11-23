const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Verify JWT token middleware
const verifyToken = async (req, res, next) => {
  try {
    // Check for token in Authorization header first, then in cookies
    let token = req.header('Authorization')?.replace('Bearer ', '');
    
    // If no token in header, check cookies
    if (!token && req.cookies) {
      token = req.cookies.authToken;
    }
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'gym-secret');
    const user = await User.findByPk(decoded.userId, {
      attributes: { exclude: ['password_hash', 'email_verification_token'] }
    });

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid token. User not found.'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
};

// Role-based access control middleware
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions'
      });
    }

    next();
  };
};

// Email verification required middleware
const requireEmailVerified = (req, res, next) => {
  if (!req.user.email_verified) {
    return res.status(403).json({
      success: false,
      message: 'Email verification required'
    });
  }
  next();
};

// Active user status middleware
const requireActiveUser = (req, res, next) => {
  if (req.user.status !== 'active') {
    return res.status(403).json({
      success: false,
      message: 'Account is not active'
    });
  }
  next();
};

module.exports = {
  verifyToken,
  authorize,
  requireEmailVerified,
  requireActiveUser
};