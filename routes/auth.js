const express = require('express');
const {
  register,
  login,
  logout,
  verifyEmail,
  getProfile
} = require('../controllers/authController');
const { verifyToken } = require('../middleware/auth');
const {
  validateResult,
  registerValidation,
  loginValidation,
  verifyEmailValidation
} = require('../services/validationService');
const {
  authLimiter,
  registerLimiter,
  emailVerificationLimiter
} = require('../middleware/rateLimiter');

const router = express.Router();

// Routes with specific rate limiting
router.post('/register', registerLimiter, registerValidation, validateResult, register);
router.post('/login', authLimiter, loginValidation, validateResult, login);
router.post('/logout', logout);
router.get('/verify-email/:token', emailVerificationLimiter, verifyEmailValidation, validateResult, verifyEmail);
router.get('/profile', verifyToken, getProfile);

module.exports = router;