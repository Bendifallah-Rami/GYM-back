const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const { 
  notificationIdValidation,
  createSystemNotificationValidation,
  notificationQueryValidation
} = require('../services/validationService');
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

// ============================================================================
// SPECIFIC ROUTES FIRST (to avoid conflicts with /:id route)
// ============================================================================

// Get my notifications (GET /api/notifications/my)
router.get('/my', 
  notificationQueryValidation,
  getUserNotifications
);

// Get unread count (GET /api/notifications/my/unread)
router.get('/my/unread', getUnreadCount);

// Mark all notifications as read (PATCH /api/notifications/mark-all-read)
router.patch('/mark-all-read', markAllAsRead);

// ============================================================================
// ADMIN/EMPLOYEE ROUTES (Staff can manage system notifications)
// ============================================================================

// Get all notifications (GET /api/notifications/admin/all)
router.get('/admin/all', 
  authorize('admin', 'employee'),
  notificationQueryValidation,
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

// ============================================================================
// DYNAMIC ROUTES LAST (/:id routes must come after specific routes)
// ============================================================================

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

// Delete notification (DELETE /api/notifications/:id)
router.delete('/:id', 
  notificationIdValidation,
  deleteNotification
);

module.exports = router;