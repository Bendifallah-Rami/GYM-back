const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const { verifyToken, authorize } = require('../middleware/auth');
const { 
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getNotificationById,
  getAllNotifications,
  createSystemNotification,
  getNotificationStats
} = require('../controllers/notificationController');

// Apply authentication to all routes
router.use(verifyToken);

// Validation rules
const notificationIdValidation = [
  param('id').isInt().withMessage('Notification ID must be a valid integer')
];

const createSystemNotificationValidation = [
  body('title').trim().isLength({ min: 1, max: 255 }).withMessage('Title is required and must be between 1-255 characters'),
  body('message').trim().isLength({ min: 1 }).withMessage('Message is required'),
  body('type').optional().isIn(['subscription', 'payment', 'class', 'general', 'email_verification']).withMessage('Invalid notification type'),
  body('user_id').optional().isInt().withMessage('User ID must be a valid integer'),
  body('user_ids').optional().isArray().withMessage('User IDs must be an array'),
  body('user_ids.*').optional().isInt().withMessage('Each user ID must be a valid integer'),
  body('send_to_all').optional().isBoolean().withMessage('Send to all must be a boolean')
];

const queryValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1-100'),
  query('type').optional().isIn(['subscription', 'payment', 'class', 'general', 'email_verification']).withMessage('Invalid notification type'),
  query('is_read').optional().isBoolean().withMessage('is_read must be a boolean'),
  query('user_id').optional().isInt().withMessage('User ID must be a valid integer')
];

// ============================================================================
// USER ROUTES (All authenticated users can manage their notifications)
// ============================================================================

// Get my notifications (GET /api/notifications/my)
router.get('/my', 
  queryValidation,
  getUserNotifications
);

// Get unread count (GET /api/notifications/my/unread)
router.get('/my/unread', getUnreadCount);

// Get notification by ID (GET /api/notifications/:id)
router.get('/:id', 
  notificationIdValidation,
  getNotificationById
);

// Mark notification as read (PATCH /api/notifications/:id/read)
router.patch('/:id/read', 
  notificationIdValidation,
  markAsRead
);

// Mark all notifications as read (PATCH /api/notifications/mark-all-read)
router.patch('/mark-all-read', markAllAsRead);

// Delete notification (DELETE /api/notifications/:id)
router.delete('/:id', 
  notificationIdValidation,
  deleteNotification
);

// ============================================================================
// ADMIN/EMPLOYEE ROUTES (Staff can manage system notifications)
// ============================================================================

// Get all notifications (GET /api/notifications/all)
router.get('/admin/all', 
  authorize('admin', 'employee'),
  queryValidation,
  getAllNotifications
);

// Get notification statistics (GET /api/notifications/admin/stats)
router.get('/admin/stats', 
  authorize('admin', 'employee'),
  getNotificationStats
);

// Create system notification (POST /api/notifications/admin/system)
router.post('/admin/system', 
  authorize('admin', 'employee'),
  createSystemNotificationValidation,
  createSystemNotification
);

module.exports = router;