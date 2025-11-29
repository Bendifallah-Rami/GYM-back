const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { verifyToken, authorize } = require('../middleware/auth');
const { 
  createClass,
  getAllClasses,
  getClassById,
  updateClass,
  deleteClass,
  getMyClasses,
  joinClass,
  leaveClass,
  getMyJoinedClasses,
  getClassParticipants
} = require('../controllers/classController');

// Apply authentication to all routes
router.use(verifyToken);

// Validation rules
const createClassValidation = [
  body('name').trim().isLength({ min: 2, max: 255 }).withMessage('Class name must be between 2-255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('coach_id').optional().isInt().withMessage('Coach ID must be a valid integer'),
  body('capacity').optional().isInt({ min: 1, max: 100 }).withMessage('Capacity must be between 1-100'),
  body('duration_minutes').optional().isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15-240 minutes'),
  body('schedule_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Schedule time must be in HH:MM format'),
  body('schedule_days').optional().isArray().withMessage('Schedule days must be an array')
];

const updateClassValidation = [
  param('id').isInt().withMessage('Class ID must be a valid integer'),
  body('name').optional().trim().isLength({ min: 2, max: 255 }).withMessage('Class name must be between 2-255 characters'),
  body('description').optional().isLength({ max: 1000 }).withMessage('Description must not exceed 1000 characters'),
  body('coach_id').optional().isInt().withMessage('Coach ID must be a valid integer'),
  body('capacity').optional().isInt({ min: 1, max: 100 }).withMessage('Capacity must be between 1-100'),
  body('duration_minutes').optional().isInt({ min: 15, max: 240 }).withMessage('Duration must be between 15-240 minutes'),
  body('schedule_time').optional().matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Schedule time must be in HH:MM format'),
  body('schedule_days').optional().isArray().withMessage('Schedule days must be an array'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean')
];

const classIdValidation = [
  param('id').isInt().withMessage('Class ID must be a valid integer')
];

const joinClassValidation = [
  param('id').isInt().withMessage('Class ID must be a valid integer'),
  body('booking_date').optional().isDate().withMessage('Booking date must be a valid date'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes must not exceed 500 characters')
];

const leaveClassValidation = [
  param('id').isInt().withMessage('Class ID must be a valid integer'),
  body('reason').optional().isLength({ max: 255 }).withMessage('Reason must not exceed 255 characters')
];

// ============================================================================
// USER ROUTES (All authenticated users can access)
// ============================================================================

// Get all classes (GET /api/classes)
router.get('/', getAllClasses);

// Get class by ID (GET /api/classes/:id)
router.get('/:id', classIdValidation, getClassById);

// Get class participants (GET /api/classes/:id/participants) - Coach/Admin only
router.get('/:id/participants', 
  authorize('coach', 'admin'),
  classIdValidation,
  getClassParticipants
);

// Get my available classes to join (GET /api/classes/my/available)
router.get('/my/available', getMyJoinedClasses);

// Join a class (POST /api/classes/:id/join)
router.post('/:id/join', 
  joinClassValidation,
  joinClass
);

// Leave/Cancel class booking (POST /api/classes/:id/leave)
router.post('/:id/leave', 
  leaveClassValidation,
  leaveClass
);

// ============================================================================
// COACH ROUTES (Coaches can manage their own classes)
// ============================================================================

// Get my classes (GET /api/classes/my)
router.get('/my/classes', 
  authorize('coach', 'admin'), 
  getMyClasses
);

// ============================================================================
// ADMIN/COACH ROUTES (Class management)
// ============================================================================

// Create new class (POST /api/classes)
router.post('/', 
  authorize('admin', 'coach'),
  createClassValidation,
  createClass
);

// Update class (PUT /api/classes/:id)
router.put('/:id', 
  authorize('admin', 'coach'),
  updateClassValidation,
  updateClass
);

// ============================================================================
// ADMIN ONLY ROUTES
// ============================================================================

// Delete class (DELETE /api/classes/:id)
router.delete('/:id', 
  authorize('admin'),
  classIdValidation,
  deleteClass
);

module.exports = router;