const { body, param } = require('express-validator');

// Validation for creating subscription plan
const createSubscriptionPlanValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Plan name is required')
    .isLength({ min: 2, max: 255 })
    .withMessage('Plan name must be between 2 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('duration_months')
    .notEmpty()
    .withMessage('Duration in months is required')
    .isInt({ min: 1, max: 120 })
    .withMessage('Duration must be between 1 and 120 months'),

  body('price')
    .notEmpty()
    .withMessage('Price is required')
    .isFloat({ min: 0 })
    .withMessage('Price must be 0 or greater')
    .custom((value) => {
      // Ensure price has at most 2 decimal places
      if (!/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Price can have at most 2 decimal places');
      }
      return true;
    }),

  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array')
    .custom((features) => {
      if (features.some(feature => typeof feature !== 'string')) {
        throw new Error('All features must be strings');
      }
      if (features.length > 50) {
        throw new Error('Maximum 50 features allowed');
      }
      return true;
    }),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
];

// Validation for updating subscription plan
const updateSubscriptionPlanValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid plan ID is required'),

  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Plan name cannot be empty')
    .isLength({ min: 2, max: 255 })
    .withMessage('Plan name must be between 2 and 255 characters'),

  body('description')
    .optional()
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Description cannot exceed 2000 characters'),

  body('duration_months')
    .optional()
    .isInt({ min: 1, max: 120 })
    .withMessage('Duration must be between 1 and 120 months'),

  body('price')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Price must be 0 or greater')
    .custom((value) => {
      if (value !== undefined && !/^\d+(\.\d{1,2})?$/.test(value.toString())) {
        throw new Error('Price can have at most 2 decimal places');
      }
      return true;
    }),

  body('features')
    .optional()
    .isArray()
    .withMessage('Features must be an array')
    .custom((features) => {
      if (features && features.some(feature => typeof feature !== 'string')) {
        throw new Error('All features must be strings');
      }
      if (features && features.length > 50) {
        throw new Error('Maximum 50 features allowed');
      }
      return true;
    }),

  body('is_active')
    .optional()
    .isBoolean()
    .withMessage('is_active must be a boolean value')
];

// Validation for plan ID parameter
const planIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('Valid plan ID is required')
];

module.exports = {
  createSubscriptionPlanValidation,
  updateSubscriptionPlanValidation,
  planIdValidation
};