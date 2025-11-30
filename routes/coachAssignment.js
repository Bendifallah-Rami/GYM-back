const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const { verifyToken, authorize } = require('../middleware/auth');
const { 
  createCoachAssignment,
  getAllCoachAssignments,
  getCoachAssignmentById,
  updateCoachAssignment,
  deleteCoachAssignment,
  getMyAssignedUsers,
  getMyCoach
} = require('../controllers/coachAssignmentController');

// Apply authentication to all routes
router.use(verifyToken);

// Validation rules
const createAssignmentValidation = [
  body('coach_id').isInt().withMessage('Coach ID must be a valid integer'),
  body('user_id').isInt().withMessage('User ID must be a valid integer'),
  body('assigned_date').optional().isDate().withMessage('Assigned date must be a valid date'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters')
];

const updateAssignmentValidation = [
  param('id').isInt().withMessage('Assignment ID must be a valid integer'),
  body('coach_id').optional().isInt().withMessage('Coach ID must be a valid integer'),
  body('user_id').optional().isInt().withMessage('User ID must be a valid integer'),
  body('assigned_date').optional().isDate().withMessage('Assigned date must be a valid date'),
  body('is_active').optional().isBoolean().withMessage('is_active must be a boolean'),
  body('notes').optional().isLength({ max: 1000 }).withMessage('Notes must not exceed 1000 characters')
];

const assignmentIdValidation = [
  param('id').isInt().withMessage('Assignment ID must be a valid integer')
];

// ============================================================================
// USER ROUTES (Users can see their assigned coach)
// ============================================================================

// Get my assigned coach (GET /api/coach-assignments/my/coach)
router.get('/my/coach', getMyCoach);

// ============================================================================
// COACH ROUTES (Coaches can see their assigned users)
// ============================================================================

// Get my assigned users (GET /api/coach-assignments/my/users)
router.get('/my/users', 
  authorize('coach', 'admin'), 
  getMyAssignedUsers
);

// ============================================================================
// ADMIN/EMPLOYEE ROUTES (Admins and employees can manage coach assignments)
// ============================================================================

// Get all coach assignments (GET /api/coach-assignments)
router.get('/', 
  authorize('admin', 'employee'), 
  getAllCoachAssignments
);

// Get coach assignment by ID (GET /api/coach-assignments/:id)
router.get('/:id', 
  authorize('admin', 'employee'),
  assignmentIdValidation, 
  getCoachAssignmentById
);

// Create new coach assignment (POST /api/coach-assignments)
router.post('/', 
  authorize('admin', 'employee'),
  createAssignmentValidation,
  createCoachAssignment
);

// Update coach assignment (PUT /api/coach-assignments/:id)
router.put('/:id', 
  authorize('admin', 'employee'),
  updateAssignmentValidation,
  updateCoachAssignment
);

// Delete coach assignment (DELETE /api/coach-assignments/:id)
router.delete('/:id', 
  authorize('admin', 'employee'),
  assignmentIdValidation,
  deleteCoachAssignment
);

module.exports = router;