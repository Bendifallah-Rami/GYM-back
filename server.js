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
const coachAssignmentRoutes = require('./routes/coachAssignment');
const notificationRoutes = require('./routes/notification');
const dashboardRoutes = require('./routes/dashboard');
const userFlowRoutes = require('./routes/userFlow');
const adminRoutes = require('./routes/admin');

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

// Coach assignment routes
app.use('/api/coach-assignments', coachAssignmentRoutes);

// Notification routes
app.use('/api/notifications', notificationRoutes);

// Dashboard routes
app.use('/api/dashboard', dashboardRoutes);

// User flow routes
app.use('/api/user-flow', userFlowRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

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
        classes: '/api/classes/*',
        coachAssignments: '/api/coach-assignments/*',
        notifications: '/api/notifications/*'
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
      classes: {
        list: 'GET /api/classes',
        create: 'POST /api/classes',
        getById: 'GET /api/classes/:id',
        update: 'PUT /api/classes/:id',
        delete: 'DELETE /api/classes/:id',
        join: 'POST /api/classes/:id/join',
        leave: 'DELETE /api/classes/:id/leave',
        myClasses: 'GET /api/classes/my/joined'
      },
      coachAssignments: {
        list: 'GET /api/coach-assignments',
        create: 'POST /api/coach-assignments',
        getById: 'GET /api/coach-assignments/:id',
        update: 'PUT /api/coach-assignments/:id',
        delete: 'DELETE /api/coach-assignments/:id',
        myClients: 'GET /api/coach-assignments/my/clients',
        myCoaches: 'GET /api/coach-assignments/my/coaches'
      },
      notifications: {
        myNotifications: 'GET /api/notifications/my',
        unreadCount: 'GET /api/notifications/my/unread',
        markAsRead: 'PATCH /api/notifications/:id/read',
        markAllAsRead: 'PATCH /api/notifications/mark-all-read',
        delete: 'DELETE /api/notifications/:id',
        adminAll: 'GET /api/notifications/admin/all',
        adminStats: 'GET /api/notifications/admin/stats',
        adminCreate: 'POST /api/notifications/admin/system'
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
      dashboard: {
        userDashboard: 'GET /api/dashboard/user (Limited class scheduling)',
        employeeDashboard: 'GET /api/dashboard/employee (Limited class scheduling)',
        adminDashboard: 'GET /api/dashboard/admin',
        systemOverview: 'GET /api/dashboard/admin/overview',
        revenueStats: 'GET /api/dashboard/admin/revenue',
        userEngagement: 'GET /api/dashboard/employee/engagement',
        quickActions: 'GET /api/dashboard/user/quick-actions'
      },
      userFlow: {
        profile: 'GET /api/user-flow/profile',
        updateProfile: 'PUT /api/user-flow/profile',
        changePassword: 'POST /api/user-flow/change-password',
        preferences: 'GET /api/user-flow/preferences (Limited - requires schema changes)',
        updatePreferences: 'PUT /api/user-flow/preferences (Limited - requires schema changes)',
        activity: 'GET /api/user-flow/activity',
        stats: 'GET /api/user-flow/stats',
        subscriptionHistory: 'GET /api/user-flow/subscription-history',
        notifications: 'GET /api/user-flow/notifications',
        classes: 'GET /api/user-flow/classes (Limited - no date-based filtering)',
        deleteAccount: 'DELETE /api/user-flow/account'
      },
      admin: {
        settings: 'GET /api/admin/settings (Not implemented - requires Settings model)',
        updateSettings: 'PUT /api/admin/settings (Not implemented - requires Settings model)',
        userManagement: 'GET /api/admin/user-management',
        bulkActions: 'POST /api/admin/users/bulk-action',
        staff: 'GET /api/admin/staff',
        reports: 'GET /api/admin/reports',
        analytics: 'GET /api/admin/analytics',
        export: 'GET /api/admin/export',
        auditLogs: 'GET /api/admin/audit-logs',
        systemHealth: 'GET /api/admin/health',
        backup: 'POST /api/admin/backup'
      }
    }
  });
});

// ============================================================================
// ERROR HANDLING MIDDLEWARE
// ============================================================================

// Global error handler
app.use((err, req, res, next) => {
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
  console.log(`🚀 Server running on port: ${PORT}`);
  console.log(`📍 Database: ${process.env.DB_NAME ? '✅ Connected' : '❌ Not connected'}`);
});

// ============================================================================
// GRACEFUL SHUTDOWN HANDLING
// ============================================================================

// Handle graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  server.close(() => {
    process.exit(0);
  });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  process.exit(1);
});

// ============================================================================
// EXPORT SERVER FOR TESTING
// ============================================================================
module.exports = app;