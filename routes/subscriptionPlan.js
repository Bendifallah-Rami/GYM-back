const express = require('express');
const router = express.Router();
const {
  getSubscriptionPlans,
  getSubscriptionPlanById,
  createSubscriptionPlan,
  updateSubscriptionPlan,
  deleteSubscriptionPlan,
  togglePlanStatus
} = require('../controllers/subscriptionPlanController');
const { verifyToken, authorize } = require('../middleware/auth');
const { generalLimiter } = require('../middleware/rateLimiter');
const { validateResult } = require('../services/validationService');
const {
  createSubscriptionPlanValidation,
  updateSubscriptionPlanValidation,
  planIdValidation
} = require('../services/subscriptionPlanValidation');

// Apply general rate limiting to all routes
router.use(generalLimiter);

// Public routes (no authentication required)
// Get all active subscription plans - users need to see available plans
router.get('/public', getSubscriptionPlans);

// Get specific plan details (public access for plan details)
router.get('/public/:id', planIdValidation, validateResult, getSubscriptionPlanById);

// Protected routes (authentication required)
// Get all subscription plans with admin/employee details
router.get('/', verifyToken, authorize('admin', 'employee'), getSubscriptionPlans);

// Get subscription plan by ID with detailed info
router.get('/:id', verifyToken, authorize('admin', 'employee'), planIdValidation, validateResult, getSubscriptionPlanById);

// Admin only routes
// Create new subscription plan
router.post('/', verifyToken, authorize('admin'), createSubscriptionPlanValidation, validateResult, createSubscriptionPlan);

// Update subscription plan
router.put('/:id', verifyToken, authorize('admin'), updateSubscriptionPlanValidation, validateResult, updateSubscriptionPlan);

// Delete subscription plan
router.delete('/:id', verifyToken, authorize('admin'), planIdValidation, validateResult, deleteSubscriptionPlan);

// Toggle plan active status
router.patch('/:id/toggle-status', verifyToken, authorize('admin'), planIdValidation, validateResult, togglePlanStatus);

module.exports = router;