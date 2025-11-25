const { body, param } = require('express-validator');

// Validation for creating subscription
const createSubscriptionValidation = [
  body('plan_id')
    .notEmpty()
    .withMessage('Plan ID is required')
    .isInt({ min: 1 })
    .withMessage('Valid plan ID is required'),

  body('payment_method')
    .notEmpty()
    .withMessage('Payment method is required')
    .isIn(['cash', 'card'])
    .withMessage('Payment method must be either cash or card'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Validation for confirming subscription
const confirmSubscriptionValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid subscription ID is required'),

  body('payment_status')
    .optional()
    .isIn(['pending', 'paid', 'failed'])
    .withMessage('Payment status must be pending, paid, or failed'),

  body('start_date')
    .optional()
    .isISO8601()
    .withMessage('Start date must be a valid date (YYYY-MM-DD)'),

  body('notes')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

// Validation for rejecting subscription
const rejectSubscriptionValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid subscription ID is required'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Reason cannot exceed 1000 characters')
];

// Validation for freezing subscription
const freezeSubscriptionValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid subscription ID is required'),

  body('frozen_until')
    .optional()
    .isISO8601()
    .withMessage('Frozen until date must be a valid date (YYYY-MM-DD)'),

  body('frozen_reason')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Frozen reason cannot exceed 500 characters')
];

// Validation for cancellation request
const cancelSubscriptionValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid subscription ID is required'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Reason cannot exceed 1000 characters')
];

// Validation for subscription ID parameter
const subscriptionIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid subscription ID is required')
];

module.exports = {
  createSubscriptionValidation,
  confirmSubscriptionValidation,
  rejectSubscriptionValidation,
  freezeSubscriptionValidation,
  cancelSubscriptionValidation,
  subscriptionIdValidation
};