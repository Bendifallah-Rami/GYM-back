const express = require('express');
const router = express.Router();
const {
  getMySubscriptions,
  getAllSubscriptions,
  getSubscriptionById,
  createSubscription,
  confirmSubscription,
  rejectSubscription,
  freezeSubscription,
  unfreezeSubscription,
  cancelSubscription
} = require('../controllers/subscriptionController');
const { verifyToken, authorize } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validateResult } = require('../services/validationService');
const {
  createSubscriptionValidation,
  confirmSubscriptionValidation,
  rejectSubscriptionValidation,
  freezeSubscriptionValidation,
  cancelSubscriptionValidation,
  subscriptionIdValidation
} = require('../services/subscriptionValidation');

// Apply rate limiting
router.use(generalLimiter);

// User routes (require authentication)
// Get user's own subscriptions
router.get('/my', verifyToken, getMySubscriptions);

// Create new subscription (user chooses a plan)
router.post('/', verifyToken, createSubscriptionValidation, validateResult, createSubscription);

// Cancel own subscription (request cancellation)
router.patch('/:id/cancel', verifyToken, cancelSubscriptionValidation, validateResult, cancelSubscription);

// Employee/Admin routes
// Get all subscriptions with filtering and pagination
router.get('/', verifyToken, authorize('admin', 'employee'), getAllSubscriptions);

// Get subscription by ID with full details
router.get('/:id', verifyToken, authorize('admin', 'employee'), subscriptionIdValidation, validateResult, getSubscriptionById);

// Confirm subscription (set as active)
router.patch('/:id/confirm', verifyToken, authorize('admin', 'employee'), confirmSubscriptionValidation, validateResult, confirmSubscription);

// Reject subscription
router.patch('/:id/reject', verifyToken, authorize('admin', 'employee'), rejectSubscriptionValidation, validateResult, rejectSubscription);

// Freeze subscription (temporarily suspend)
router.patch('/:id/freeze', verifyToken, authorize('admin', 'employee'), freezeSubscriptionValidation, validateResult, freezeSubscription);

// Unfreeze subscription (reactivate)
router.patch('/:id/unfreeze', verifyToken, authorize('admin', 'employee'), subscriptionIdValidation, validateResult, unfreezeSubscription);

module.exports = router;