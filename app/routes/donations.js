const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const donationController = require('../controllers/donationController');
const { protect, authorize, checkChurchAccess, checkResourceAccess } = require('../middleware/auth');
const { handleValidationErrors, sanitizeInput, validateObjectId, validateAmount } = require('../middleware/validation');
const Donation = require('../models/Donation');

// @route   POST /api/donations
// @desc    Create a new donation (manual entry)
// @access  Private (Church Members)
router.post('/', [
  protect,
  sanitizeInput,
  validateAmount,
  body('churchId')
    .isMongoId()
    .withMessage('Valid church ID is required'),
  body('donorId')
    .isMongoId()
    .withMessage('Valid donor ID is required'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('paymentMethod')
    .isIn(['cash', 'bank-transfer', 'check', 'mobile-money'])
    .withMessage('Invalid payment method specified'),
  body('donorInfo.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Donor name must be between 2 and 100 characters'),
  body('donorInfo.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('donorInfo.phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('donorInfo.isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean'),
  handleValidationErrors,
], donationController.createDonation);

// @route   POST /api/donations/online
// @desc    Initialize online donation payment
// @access  Public
router.post('/online', [
  sanitizeInput,
  validateAmount,
  body('churchId')
    .isMongoId()
    .withMessage('Valid church ID is required'),
  body('donorId')
    .optional()
    .isMongoId()
    .withMessage('Valid donor ID is required'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('donorInfo.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Donor name must be between 2 and 100 characters'),
  body('donorInfo.email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('donorInfo.phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('donorInfo.isAnonymous')
    .optional()
    .isBoolean()
    .withMessage('isAnonymous must be a boolean'),
  body('donorInfo.isRecurring')
    .optional()
    .isBoolean()
    .withMessage('isRecurring must be a boolean'),
  body('donorInfo.recurringFrequency')
    .optional()
    .isIn(['weekly', 'monthly', 'quarterly', 'yearly'])
    .withMessage('Invalid recurring frequency specified'),
  handleValidationErrors,
], donationController.initializeOnlineDonation);

// @route   POST /api/donations/callback
// @desc    Handle payment gateway callback
// @access  Public
router.post('/callback', donationController.handlePaymentCallback);

// @route   GET /api/donations
// @desc    Get all donations (with filtering)
// @access  Private (Church Members)
router.get('/', [
  protect,
], donationController.getAllDonations);

// @route   GET /api/donations/church/:churchId
// @desc    Get donations for a specific church
// @access  Private (Church Members)
router.get('/church/:churchId', [
  protect,
  checkChurchAccess,
], donationController.getDonationsByChurch);

// @route   GET /api/donations/:id
// @desc    Get donation by ID
// @access  Private (Church Members)
router.get('/:id', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
], donationController.getDonationById);

// @route   PUT /api/donations/:id
// @desc    Update donation
// @access  Private (Church Admin)
router.put('/:id', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
  sanitizeInput,
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('notes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 30 })
    .withMessage('Each tag cannot exceed 30 characters'),
  handleValidationErrors,
], donationController.updateDonation);

// @route   DELETE /api/donations/:id
// @desc    Delete donation
// @access  Private (Church Admin)
router.delete('/:id', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
], donationController.deleteDonation);

// @route   POST /api/donations/:id/verify
// @desc    Verify donation
// @access  Private (Church Admin)
router.post('/:id/verify', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
  sanitizeInput,
  body('verificationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Verification notes cannot exceed 500 characters'),
  handleValidationErrors,
], donationController.verifyDonation);

// @route   POST /api/donations/:id/generate-receipt
// @desc    Generate donation receipt
// @access  Private (Church Admin)
router.post('/:id/generate-receipt', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
], donationController.generateReceipt);

// @route   GET /api/donations/:id/receipt
// @desc    Get donation receipt
// @access  Private (Church Members)
router.get('/:id/receipt', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
], donationController.getReceipt);

// @route   POST /api/donations/:id/tags
// @desc    Add tags to donation
// @access  Private (Church Admin)
router.post('/:id/tags', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
  sanitizeInput,
  body('tags')
    .isArray({ min: 1 })
    .withMessage('At least one tag is required'),
  body('tags.*')
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),
  handleValidationErrors,
], donationController.addTags);

// @route   DELETE /api/donations/:id/tags
// @desc    Remove tags from donation
// @access  Private (Church Admin)
router.delete('/:id/tags', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
  sanitizeInput,
  body('tags')
    .isArray({ min: 1 })
    .withMessage('At least one tag is required'),
  handleValidationErrors,
], donationController.removeTags);

// @route   POST /api/donations/:id/notes
// @desc    Add note to donation
// @access  Private (Church Members)
router.post('/:id/notes', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
  sanitizeInput,
  body('content')
    .trim()
    .isLength({ min: 1, max: 500 })
    .withMessage('Note content must be between 1 and 500 characters'),
  body('category')
    .optional()
    .isIn(['general', 'pastoral', 'financial', 'attendance', 'other'])
    .withMessage('Invalid note category specified'),
  handleValidationErrors,
], donationController.addNote);

// @route   GET /api/donations/stats/church/:churchId
// @desc    Get donation statistics for a church
// @access  Private (Church Members)
router.get('/stats/church/:churchId', [
  protect,
  checkChurchAccess,
], donationController.getDonationStats);

// @route   GET /api/donations/totals/church/:churchId
// @desc    Get total donations for a church
// @access  Private (Church Members)
router.get('/totals/church/:churchId', [
  protect,
  checkChurchAccess,
], donationController.getTotalDonations);

// @route   GET /api/donations/by-category/church/:churchId
// @desc    Get donations grouped by category for a church
// @access  Private (Church Members)
router.get('/by-category/church/:churchId', [
  protect,
  checkChurchAccess,
], donationController.getDonationsByCategory);

// @route   GET /api/donations/by-date/church/:churchId
// @desc    Get donations grouped by date for a church
// @access  Private (Church Members)
router.get('/by-date/church/:churchId', [
  protect,
  checkChurchAccess,
], donationController.getDonationsByDate);

// @route   POST /api/donations/bulk-import
// @desc    Bulk import donations from CSV/Excel
// @access  Private (Church Admin)
router.post('/bulk-import', [
  protect,
  sanitizeInput,
  body('churchId')
    .isMongoId()
    .withMessage('Valid church ID is required'),
  body('donations')
    .isArray({ min: 1 })
    .withMessage('At least one donation is required'),
  body('donations.*.amount')
    .isFloat({ min: 0.01 })
    .withMessage('Each donation amount must be greater than 0'),
  body('donations.*.category')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Each donation category must be between 2 and 50 characters'),
  body('donations.*.donorInfo.name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each donor name must be between 2 and 100 characters'),
  handleValidationErrors,
], donationController.bulkImportDonations);

// @route   GET /api/donations/export/church/:churchId
// @desc    Export donations to CSV/Excel
// @access  Private (Church Members)
router.get('/export/church/:churchId', [
  protect,
  checkChurchAccess,
], donationController.exportDonations);

// @route   POST /api/donations/:id/refund
// @desc    Process donation refund
// @access  Private (Church Admin)
router.post('/:id/refund', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(Donation),
  sanitizeInput,
  body('refundAmount')
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be greater than 0'),
  body('refundReason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Refund reason must be between 10 and 500 characters'),
  handleValidationErrors,
], donationController.processRefund);

// @route   GET /api/donations/pending/church/:churchId
// @desc    Get pending donations for a church
// @access  Private (Church Members)
router.get('/pending/church/:churchId', [
  protect,
  checkChurchAccess,
], donationController.getPendingDonations);

// @route   GET /api/donations/completed/church/:churchId
// @desc    Get completed donations for a church
// @access  Private (Church Members)
router.get('/completed/church/:churchId', [
  protect,
  checkChurchAccess,
], donationController.getCompletedDonations);

// @route   GET /api/donations/failed/church/:churchId
// @desc    Get failed donations for a church
// @access  Private (Church Members)
router.get('/failed/church/:churchId', [
  protect,
  checkChurchAccess,
], donationController.getFailedDonations);

module.exports = router;
