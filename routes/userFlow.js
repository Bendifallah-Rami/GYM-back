const express = require('express');
const router = express.Router();
const { verifyToken, authorize } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const {
  getUserProfile,
  updateUserProfile,
  changePassword,
  getUserPreferences,
  updateUserPreferences,
  getUserActivity,
  getUserStats,
  getUserSubscriptionHistory,
  deleteAccount,
  getUserNotifications,
  getUserClasses
} = require('../controllers/userFlowController');

// Apply rate limiting
router.use(generalLimiter);

// ============================================================================
// USER PROFILE MANAGEMENT
// ============================================================================

// Get user profile (GET /api/user-flow/profile)
router.get('/profile', verifyToken, getUserProfile);

// Update user profile (PUT /api/user-flow/profile)
router.put('/profile', verifyToken, updateUserProfile);

// Change password (POST /api/user-flow/change-password)
router.post('/change-password', verifyToken, changePassword);

// ============================================================================
// USER PREFERENCES & SETTINGS (Not implemented - requires schema changes)
// ============================================================================

// Note: Preferences functionality requires adding preference fields to User model
// Get user preferences (GET /api/user-flow/preferences)
router.get('/preferences', verifyToken, getUserPreferences);

// Update user preferences (PUT /api/user-flow/preferences)
router.put('/preferences', verifyToken, updateUserPreferences);

// ============================================================================
// USER ACTIVITY & STATS
// ============================================================================

// Get user activity history (GET /api/user-flow/activity)
router.get('/activity', verifyToken, getUserActivity);

// Get user statistics (GET /api/user-flow/stats)
router.get('/stats', verifyToken, getUserStats);

// ============================================================================
// USER SUBSCRIPTIONS
// ============================================================================

// Get user subscription history (GET /api/user-flow/subscription-history)
router.get('/subscription-history', verifyToken, getUserSubscriptionHistory);

// ============================================================================
// USER NOTIFICATIONS
// ============================================================================

// Get user notifications (GET /api/user-flow/notifications)
router.get('/notifications', verifyToken, getUserNotifications);

// ============================================================================
// USER CLASSES & BOOKINGS
// ============================================================================

// Get user classes (joined/booked) (GET /api/user-flow/classes)
router.get('/classes', verifyToken, getUserClasses);

// ============================================================================
// ACCOUNT MANAGEMENT
// ============================================================================

// Delete user account (DELETE /api/user-flow/account)
router.delete('/account', verifyToken, deleteAccount);

module.exports = router;