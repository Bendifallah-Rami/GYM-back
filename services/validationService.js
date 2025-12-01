const { body, param, validationResult, query } = require('express-validator');

/**
 * Middleware to handle validation results
 */
const validateResult = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * User registration validation rules
 */
const registerValidation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters long')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('role')
    .optional()
    .isIn(['user', 'employee', 'admin', 'coach'])
    .withMessage('Role must be one of: user, employee, admin, coach')
];

/**
 * User login validation rules
 */
const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Email verification token validation
 */
const verifyEmailValidation = [
  param('token')
    .isLength({ min: 32, max: 64 })
    .withMessage('Invalid verification token format')
    .matches(/^[a-f0-9]+$/)
    .withMessage('Verification token must be a valid hexadecimal string')
];

/**
 * Password reset request validation
 */
const passwordResetRequestValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
];

/**
 * Password reset validation
 */
const passwordResetValidation = [
  param('token')
    .isLength({ min: 32, max: 64 })
    .withMessage('Invalid reset token format')
    .matches(/^[a-f0-9]+$/)
    .withMessage('Reset token must be a valid hexadecimal string'),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    })
];

/**
 * Profile update validation
 */
const updateProfileValidation = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters long')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Name can only contain letters and spaces'),
  
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
    .isLength({ min: 10, max: 20 })
    .withMessage('Phone number must be between 10 and 20 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
];

/**
 * Change password validation
 */
const changePasswordValidation = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be between 6 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, and one number'),
  
  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
];

/**
 * User ID parameter validation
 */
const userIdValidation = [
  param('id')
    .isInt({ min: 1 })
    .withMessage('User ID must be a positive integer')
];

/**
 * Role update validation (for admin use)
 */
const updateRoleValidation = [
  body('role')
    .isIn(['user', 'employee', 'admin', 'coach'])
    .withMessage('Role must be one of: user, employee, admin, coach')
];

/**
 * User status validation (for admin use)
 */
const updateStatusValidation = [
  body('status')
    .isIn(['active', 'inactive', 'suspended'])
    .withMessage('Status must be one of: active, inactive, suspended')
];

/**
 * Common email validation
 */
const emailValidation = [
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 })
    .withMessage('Email must not exceed 255 characters')
];

/**
 * Common password validation
 */
const passwordValidation = [
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, and one number')
];

/**
 * Search query validation
 */
const searchValidation = [
  body('query')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search query must be between 1 and 100 characters')
];

/**
 * Pagination validation
 */
const paginationValidation = [
  body('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

/**
 * Notification validation rules
 */
const notificationIdValidation = [
  param('id').isInt().withMessage('Notification ID must be a valid integer')
];

const createSystemNotificationValidation = [
  body('title')
    .trim()
    .isLength({ min: 1, max: 255 })
    .withMessage('Title is required and must be between 1-255 characters'),
  
  body('message')
    .trim()
    .isLength({ min: 1 })
    .withMessage('Message is required'),
  
  body('type')
    .optional()
    .isIn(['subscription', 'payment', 'class', 'general', 'email_verification', 'attendance', 'coach_assignment'])
    .withMessage('Invalid notification type'),
  
  body('user_id')
    .optional()
    .isInt()
    .withMessage('User ID must be a valid integer'),
  
  body('user_ids')
    .optional()
    .isArray()
    .withMessage('User IDs must be an array'),
  
  body('user_ids.*')
    .optional()
    .isInt()
    .withMessage('Each user ID must be a valid integer'),
  
  body('send_to_all')
    .optional()
    .isBoolean()
    .withMessage('Send to all must be a boolean')
];

const notificationQueryValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1-100'),
  
  query('type')
    .optional()
    .isIn(['subscription', 'payment', 'class', 'general', 'email_verification', 'attendance', 'coach_assignment'])
    .withMessage('Invalid notification type'),
  
  query('is_read')
    .optional()
    .isBoolean()
    .withMessage('is_read must be a boolean'),
  
  query('user_id')
    .optional()
    .isInt()
    .withMessage('User ID must be a valid integer')
];

module.exports = {
  validateResult,
  registerValidation,
  loginValidation,
  verifyEmailValidation,
  passwordResetRequestValidation,
  passwordResetValidation,
  updateProfileValidation,
  changePasswordValidation,
  userIdValidation,
  updateRoleValidation,
  updateStatusValidation,
  emailValidation,
  passwordValidation,
  searchValidation,
  paginationValidation,
  notificationIdValidation,
  createSystemNotificationValidation,
  notificationQueryValidation
};