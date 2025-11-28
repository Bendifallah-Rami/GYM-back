// ============================================================================
// GYM MANAGEMENT API SERVER
// ============================================================================

// ============================================================================
// DEPENDENCIES
// ============================================================================
const express = require('express');
const path = require('path');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const dotenv = require('dotenv');

// ============================================================================
// CONFIGURATION
// ============================================================================
// Load environment variables
dotenv.config();

// Import configuration files
require('./config/passport');
const { generalLimiter } = require('./middleware/rateLimiter');

// ============================================================================
// ROUTE IMPORTS
// ============================================================================
const authRoutes = require('./routes/auth');
const oauthRoutes = require('./routes/oauth');
const userRoutes = require('./routes/user');
const subscriptionPlanRoutes = require('./routes/subscriptionPlan');
const subscriptionRoutes = require('./routes/subscription');
const attendanceRoutes = require('./routes/attendance');
const classRoutes = require('./routes/class');

// ============================================================================
// APP INITIALIZATION
// ============================================================================
const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================
app.use(helmet({
  crossOriginEmbedderPolicy: false // Allow embedding for OAuth
}));

// Rate limiting (apply early for security)
app.use(generalLimiter);

// ============================================================================
// CORS CONFIGURATION
// ============================================================================
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-csrf-token']
}));

// ============================================================================
// BODY PARSING MIDDLEWARE
// ============================================================================
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// ============================================================================
// SESSION CONFIGURATION
// ============================================================================
app.use(session({
  secret: process.env.SESSION_SECRET || 'gym-session-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
  },
  name: 'gym.session.id' // Custom session name for security
}));

// ============================================================================
// PASSPORT AUTHENTICATION
// ============================================================================
app.use(passport.initialize());
app.use(passport.session());

// ============================================================================
// STATIC FILES
// ============================================================================
app.use(express.static(path.join(__dirname, 'public')));

// ============================================================================
// API ROUTES
// ============================================================================
// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', oauthRoutes);

// User management routes
app.use('/api/users', userRoutes);

// Subscription management routes
app.use('/api/subscription-plans', subscriptionPlanRoutes);
app.use('/api/subscriptions', subscriptionRoutes);

// Attendance management routes
app.use('/api/attendance', attendanceRoutes);

// Class management routes
app.use('/api/classes', classRoutes);

// ============================================================================
// APPLICATION ROUTES
// ============================================================================

// Root route - API information
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to GYM Management API',
    version: '1.0.0',
    documentation: {
      endpoints: {
        auth: '/api/auth/*',
        users: '/api/users/*',
        subscriptionPlans: '/api/subscription-plans/*',
        subscriptions: '/api/subscriptions/*',
        attendance: '/api/attendance/*',
        qrCodes: '/api/qr/*'
      },
      oauth: process.env.GOOGLE_CLIENT_ID ? '/api/auth/google' : 'Not configured'
    },
    status: 'Active',
    timestamp: new Date().toISOString()
  });
});

// Health check route
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    services: {
      database: 'Connected', // You might want to add actual DB health check
      email: process.env.EMAIL_USER ? 'Configured' : 'Not configured',
      oauth: process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'
    }
  });
});

// API documentation route
app.get('/api', (req, res) => {
  res.json({
    api: 'GYM Management API',
    version: '1.0.0',
    endpoints: {
      authentication: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        logout: 'POST /api/auth/logout',
        verify: 'GET /api/auth/verify/:token',
        google: 'GET /api/auth/google'
      },
      users: {
        profile: 'GET /api/users/profile',
        list: 'GET /api/users',
        getById: 'GET /api/users/:id',
        update: 'PUT /api/users/:id'
      },
      subscriptionPlans: {
        list: 'GET /api/subscription-plans',
        create: 'POST /api/subscription-plans',
        update: 'PUT /api/subscription-plans/:id',
        delete: 'DELETE /api/subscription-plans/:id'
      },
      subscriptions: {
        mySubscriptions: 'GET /api/subscriptions/my',
        create: 'POST /api/subscriptions',
        confirm: 'PATCH /api/subscriptions/:id/confirm',
        reject: 'PATCH /api/subscriptions/:id/reject',
        freeze: 'PATCH /api/subscriptions/:id/freeze',
        unfreeze: 'PATCH /api/subscriptions/:id/unfreeze',
        cancel: 'PATCH /api/subscriptions/:id/cancel'
      },
      attendance: {
        checkIn: 'POST /api/attendance/check-in',
        checkOut: 'POST /api/attendance/check-out',
        myAttendance: 'GET /api/attendance/my',
        myStats: 'GET /api/attendance/my/stats',
        allAttendance: 'GET /api/attendance',
        stats: 'GET /api/attendance/stats',
        activeUsers: 'GET /api/attendance/active'
      },
      qrCodes: {
        generateAttendanceQR: 'GET /api/qr/attendance',
        generateMembershipQR: 'GET /api/qr/membership',
        verifyQR: 'POST /api/qr/verify',
        qrHistory: 'GET /api/qr/history'
      }
    }
  });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// Global error handler
app.use((err, req, res, next) => {
  console.error('🚨 Error occurred:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString()
  });

  // Handle specific error types
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation Error',
      errors: err.errors
    });
  }

  if (err.name === 'UnauthorizedError') {
    return res.status(401).json({
      success: false,
      message: 'Unauthorized access'
    });
  }

  // Default error response
  res.status(err.status || 500).json({
    success: false,
    message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404 handler - must be last
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
    availableEndpoints: '/api'
  });
});

// ============================================================================
// SERVER STARTUP
// ============================================================================

const server = app.listen(PORT, () => {
  console.log('');
  console.log('🚀 ============================================');
  console.log('🏋️  GYM MANAGEMENT API SERVER STARTED');
  console.log('🚀 ============================================');
  console.log(`📍 Server running on port: ${PORT}`);
  console.log(`🌐 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔗 API Base URL: http://localhost:${PORT}/api`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health`);
  console.log('');
  
  // Configuration status
  console.log('📋 Configuration Status:');
  console.log(`   Database: ${process.env.DB_NAME ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Email Service: ${process.env.EMAIL_USER ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? '✅ Configured' : '❌ Not configured'}`);
  console.log(`   JWT Secret: ${process.env.JWT_SECRET ? '✅ Configured' : '❌ Not configured'}`);
  console.log('');
  
  // Available endpoints
  console.log('🛣️  Available Endpoints:');
  console.log('   📝 Documentation: GET /api');
  console.log('   🔐 Authentication: /api/auth/*');
  console.log('   👥 Users: /api/users/*');
  console.log('   📋 Subscription Plans: /api/subscription-plans/*');
  console.log('   💳 Subscriptions: /api/subscriptions/*');
  console.log('   📅 Attendance: /api/attendance/*');
  console.log('   🏃‍♂️ Classes: /api/classes/*');
  console.log('');
  
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    console.log(`🔐 Google OAuth URL: http://localhost:${PORT}/api/auth/google`);
  } else {
    console.log(`⚠️  Google OAuth not configured - add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET to .env`);
  }
  
  console.log('🚀 ============================================');
  console.log('');
});

// ============================================================================
// GRACEFUL SHUTDOWN HANDLING
// ============================================================================

// Handle graceful shutdown
process.on('SIGTERM', () => {
  console.log('📴 SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('👋 Server closed successfully');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('📴 SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('👋 Server closed successfully');
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// ============================================================================
// EXPORT SERVER FOR TESTING
// ============================================================================
module.exports = app;