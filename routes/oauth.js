const express = require('express');
const passport = require('passport');
const { googleOAuthSuccess, googleOAuthFailure } = require('../controllers/authController');

const router = express.Router();

// Google OAuth routes
router.get('/google',
  passport.authenticate('google', { 
    scope: ['profile', 'email'] 
  })
);

// Google OAuth callback
router.get('/google/callback',
  passport.authenticate('google', { 
    failureRedirect: '/api/auth/google/failure',
    session: false 
  }),
  googleOAuthSuccess
);

// Google OAuth failure
router.get('/google/failure', googleOAuthFailure);

module.exports = router;