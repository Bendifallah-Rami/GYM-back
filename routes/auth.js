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

const router = express.Router();

// Routes
router.post('/register', registerValidation, validateResult, register);
router.post('/login', loginValidation, validateResult, login);
router.post('/logout', logout);
router.get('/verify-email/:token', verifyEmailValidation, validateResult, verifyEmail);
router.get('/profile', verifyToken, getProfile);

module.exports = router;