const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { verifyToken, authorize } = require('../middleware/auth');
const { attendanceLimiter } = require('../middleware/rateLimiter');
const { 
  checkIn,
  checkOut,
  searchUsersForAttendance,
  verifyQRCode,
  getMyAttendance,
  getAllAttendance,
  getAttendanceStats,
  getCurrentlyCheckedIn
} = require('../controllers/attendanceController');

// Apply authentication to all routes
router.use(verifyToken);

// Validation rules
const checkInValidation = [
  body('user_id').isInt().withMessage('User ID is required and must be a valid integer'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters')
];

const checkOutValidation = [
  body('user_id').isInt().withMessage('User ID is required and must be a valid integer'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters')
];

const qrVerificationValidation = [
  body('qrData').notEmpty().withMessage('QR code data is required')
];

// ============================================================================
// STAFF ROUTES (Employee/Admin only)
// ============================================================================

// Search users for attendance (GET /api/attendance/search)
router.get('/search', 
  authorize(['employee', 'admin']), 
  searchUsersForAttendance
);

// Verify QR code (POST /api/attendance/verify-qr)
router.post('/verify-qr', 
  authorize(['employee', 'admin']), 
  qrVerificationValidation,
  verifyQRCode
);

// Check in user (POST /api/attendance/check-in)
router.post('/check-in', 
  authorize(['employee', 'admin']),
  attendanceLimiter, 
  checkInValidation, 
  checkIn
);

// Check out user (POST /api/attendance/check-out)
router.post('/check-out', 
  authorize(['employee', 'admin']),
  attendanceLimiter, 
  checkOutValidation, 
  checkOut
);

// Get all attendance records (GET /api/attendance)
router.get('/', 
  authorize(['employee', 'admin']), 
  getAllAttendance
);

// Get attendance statistics for any user (GET /api/attendance/stats)
router.get('/stats', 
  authorize(['employee', 'admin']), 
  getAttendanceStats
);

// Get currently checked-in users (GET /api/attendance/active)
router.get('/active', 
  authorize(['employee', 'admin']), 
  getCurrentlyCheckedIn
);

// ============================================================================
// USER ROUTES (All authenticated users can access)
// ============================================================================

// Get my attendance history (GET /api/attendance/my)
router.get('/my', getMyAttendance);

// Get my attendance statistics (GET /api/attendance/my/stats)
router.get('/my/stats', getAttendanceStats);

module.exports = router;