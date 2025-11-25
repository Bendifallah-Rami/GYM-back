const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { User } = require('../models');
const { 
  sendVerificationEmail, 
  sendWelcomeEmail, 
  createNotification 
} = require('../services/emailService');

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: '7d'
  });
};

// Register new user
const register = async (req, res) => {
  try {
    const { name, email, phone, password, role = 'user' } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User already exists with this email'
      });
    }

    // Generate salt and hash password
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate email verification token
    const emailToken = crypto.randomBytes(32).toString('hex');
    const tokenExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Create user
    const user = await User.create({
      name,
      email,
      phone,
      password_hash: hashedPassword,
      role,
      email_verification_token: emailToken,
      email_verification_expires: tokenExpiry
    });

    // Generate JWT token
    const token = generateToken(user.id);

    // Set JWT token as HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    // Send response immediately
    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified
      }
    });

    // Send verification email asynchronously (fire-and-forget)
    setImmediate(async () => {
      try {
        await sendVerificationEmail(user.email, user.name, emailToken);
      } catch (emailError) {
        // Silent error logging for async email
        console.error(`📧 Email sending failed for ${user.email}: ${emailError.message}`);
      }

      try {
        await createNotification(
          user.id,
          'Welcome to Our Gym!',
          'Please verify your email and choose a subscription plan to get started.',
          'email_verification'
        );
      } catch (notificationError) {
        // Silent error logging for async notification
        console.error(`📝 Notification creation failed for user ${user.id}: ${notificationError.message}`);
      }
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
};

// Login user
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user by email
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid email or password'
      });
    }

    // Update last login
    await user.update({ last_login: new Date() });

    // Generate JWT token
    const token = generateToken(user.id);

    // Set JWT token as HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        email_verified: user.email_verified,
        last_login: user.last_login
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
};

// Verify email
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.params;

    // Find user by verification token
    const user = await User.findOne({
      where: {
        email_verification_token: token
      }
    });

    if (!user || user.email_verification_expires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired verification token'
      });
    }

    // Update user as verified
    await user.update({
      email_verified: true,
      email_verification_token: null,
      email_verification_expires: null,
      last_login: new Date()
    });

    // Send response first for fast API response
    res.json({
      success: true,
      message: 'Email verified successfully!'
    });

    // Send welcome email and create notification asynchronously after response
    setImmediate(async () => {
      try {
        await sendWelcomeEmail(user.email, user.name);
      } catch (emailError) {
        console.error('📧 Welcome email failed:', emailError.message);
      }

      try {
        await createNotification(
          user.id,
          'Email Verified Successfully!',
          'Your email has been verified. You can now choose a subscription plan.',
          'general'
        );
      } catch (notificationError) {
        console.error('📝 Notification creation failed:', notificationError.message);
      }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
};

// Get current user profile
const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, {
      attributes: { exclude: ['password_hash', 'email_verification_token'] }
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.json({
      success: true,
      user
    });

  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user profile',
      error: error.message
    });
  }
};

// Google OAuth callback
const googleOAuthCallback = async (accessToken, refreshToken, profile, done) => {
  try {
    // Check if user already exists with this Google ID
    let user = await User.findOne({ where: { google_id: profile.id } });
    
    if (user) {
      // User exists, update last login
      await user.update({ last_login: new Date() });
      return done(null, user);
    }
    
    // Check if user exists with this email
    user = await User.findOne({ where: { email: profile.emails[0].value } });
    
    if (user) {
      // Link Google account to existing user
      await user.update({
        google_id: profile.id,
        profile_picture: profile.photos[0]?.value,
        email_verified: true,
        last_login: new Date()
      });
      
      // Create notification for account linking (silently)
      try {
        await createNotification(
          user.id,
          'Google Account Linked',
          'Your Google account has been successfully linked to your gym membership.',
          'general'
        );
      } catch (notificationError) {
        console.error('📝 OAuth notification skipped:', notificationError.message);
      }
      
      return done(null, user);
    }
    
    // Create new user from Google profile
    const newUser = await User.create({
      name: profile.displayName,
      email: profile.emails[0].value,
      phone: '0000000000', // Temporary phone number for OAuth users
      google_id: profile.id,
      profile_picture: profile.photos[0]?.value,
      role: 'user',
      email_verified: true, // Google emails are already verified
      last_login: new Date()
    });
    
    // Send welcome email and create notification for OAuth user asynchronously
    setImmediate(async () => {
      try {
        await sendWelcomeEmail(newUser.email, newUser.name);
      } catch (emailError) {
        console.error('📧 OAuth welcome email failed:', emailError.message);
      }

      try {
        await createNotification(
          newUser.id,
          'Welcome via Google!',
          'Welcome to our gym! Please complete your profile and choose a subscription plan.',
          'general'
        );
      } catch (notificationError) {
        console.error('📝 OAuth notification failed:', notificationError.message);
      }
    });
    
    return done(null, newUser);
    
  } catch (error) {
    console.error('Google OAuth error:', error);
    return done(error, null);
  }
};

// Google OAuth success handler
const googleOAuthSuccess = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(400).json({
        success: false,
        message: 'Google authentication failed'
      });
    }
    
    // Generate JWT token
    const token = generateToken(req.user.id);
    
    // Set JWT token as HTTP-only cookie
    res.cookie('authToken', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
    });
    
    // Return user data and token
    res.json({
      success: true,
      message: 'Google authentication successful',
      token,
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        status: req.user.status,
        email_verified: req.user.email_verified,
        profile_picture: req.user.profile_picture,
        last_login: req.user.last_login
      }
    });
    
  } catch (error) {
    console.error('Google OAuth success error:', error);
    res.status(500).json({
      success: false,
      message: 'Authentication processing failed',
      error: error.message
    });
  }
};

// Google OAuth failure handler
const googleOAuthFailure = (req, res) => {
  res.status(401).json({
    success: false,
    message: 'Google authentication failed',
    error: 'Authentication was cancelled or failed'
  });
};

// Logout user
const logout = (req, res) => {
  try {
    // Clear the auth cookie
    res.clearCookie('authToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });

    res.json({
      success: true,
      message: 'Logout successful'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  getProfile,
  googleOAuthCallback,
  googleOAuthSuccess,
  googleOAuthFailure
};