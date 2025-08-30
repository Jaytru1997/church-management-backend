const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const authController = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');
const { handleValidationErrors, sanitizeInput } = require('../middleware/validation');

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  sanitizeInput,
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  body('role')
    .optional()
    .isIn(['admin', 'volunteer', 'member'])
    .withMessage('Invalid role specified'),
  handleValidationErrors,
], authController.register);

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', [
  sanitizeInput,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors,
], authController.login);

// @route   POST /api/auth/refresh-token
// @desc    Refresh JWT token
// @access  Public
router.post('/refresh-token', [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required'),
  handleValidationErrors,
], authController.refreshToken);

// @route   POST /api/auth/logout
// @desc    Logout user (invalidate token)
// @access  Private
router.post('/logout', protect, authController.logout);

// @route   POST /api/auth/forgot-password
// @desc    Send password reset email
// @access  Public
router.post('/forgot-password', [
  sanitizeInput,
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  handleValidationErrors,
], authController.forgotPassword);

// @route   POST /api/auth/reset-password
// @desc    Reset password with token
// @access  Public
router.post('/reset-password', [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors,
], authController.resetPassword);

// @route   POST /api/auth/verify-email
// @desc    Verify email address with token
// @access  Public
router.post('/verify-email', [
  body('token')
    .notEmpty()
    .withMessage('Verification token is required'),
  handleValidationErrors,
], authController.verifyEmail);

// @route   POST /api/auth/resend-verification
// @desc    Resend email verification
// @access  Private
router.post('/resend-verification', protect, authController.resendVerification);

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, authController.getMe);

// @route   PUT /api/auth/me
// @desc    Update current user profile
// @access  Private
router.put('/me', [
  protect,
  sanitizeInput,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  handleValidationErrors,
], authController.updateProfile);

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', [
  protect,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase letter, one uppercase letter, and one number'),
  handleValidationErrors,
], authController.changePassword);

// @route   PUT /api/auth/preferences
// @desc    Update user preferences
// @access  Private
router.put('/preferences', [
  protect,
  body('notifications.email')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be a boolean'),
  body('notifications.push')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be a boolean'),
  body('notifications.sms')
    .optional()
    .isBoolean()
    .withMessage('SMS notifications must be a boolean'),
  body('language')
    .optional()
    .isIn(['en', 'yo', 'ig', 'ha'])
    .withMessage('Invalid language specified'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  handleValidationErrors,
], authController.updatePreferences);

// @route   DELETE /api/auth/me
// @desc    Delete current user account
// @access  Private
router.delete('/me', [
  protect,
  body('password')
    .notEmpty()
    .withMessage('Password is required for account deletion'),
  handleValidationErrors,
], authController.deleteAccount);

// @route   GET /api/auth/users
// @desc    Get all users (admin only)
// @access  Private (Admin)
router.get('/users', [
  protect,
  authorize('admin'),
], authController.getAllUsers);

// @route   GET /api/auth/users/:id
// @desc    Get user by ID (admin only)
// @access  Private (Admin)
router.get('/users/:id', [
  protect,
  authorize('admin'),
], authController.getUserById);

// @route   PUT /api/auth/users/:id
// @desc    Update user by ID (admin only)
// @access  Private (Admin)
router.put('/users/:id', [
  protect,
  authorize('admin'),
  sanitizeInput,
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('role')
    .optional()
    .isIn(['admin', 'volunteer', 'member'])
    .withMessage('Invalid role specified'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors,
], authController.updateUser);

// @route   DELETE /api/auth/users/:id
// @desc    Delete user by ID (admin only)
// @access  Private (Admin)
router.delete('/users/:id', [
  protect,
  authorize('admin'),
], authController.deleteUser);

// @route   POST /api/auth/users/:id/activate
// @desc    Activate user account (admin only)
// @access  Private (Admin)
router.post('/users/:id/activate', [
  protect,
  authorize('admin'),
], authController.activateUser);

// @route   POST /api/auth/users/:id/deactivate
// @desc    Deactivate user account (admin only)
// @access  Private (Admin)
router.post('/users/:id/deactivate', [
  protect,
  authorize('admin'),
  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Deactivation reason cannot exceed 200 characters'),
  handleValidationErrors,
], authController.deactivateUser);

module.exports = router;
