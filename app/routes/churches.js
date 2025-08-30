const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const churchController = require('../controllers/churchController');
const { protect, authorize, checkChurchAccess } = require('../middleware/auth');
const { handleValidationErrors, sanitizeInput, validateObjectId } = require('../middleware/validation');

// @route   POST /api/churches
// @desc    Create a new church
// @access  Private
router.post('/', [
  protect,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Church name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('address.city')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('address.state')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  body('address.country')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country cannot exceed 100 characters'),
  body('contact.phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('contact.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('contact.website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  body('denomination')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Denomination cannot exceed 100 characters'),
  body('pastor.name')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Pastor name cannot exceed 100 characters'),
  body('pastor.phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('pastor.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('settings.currency')
    .optional()
    .isIn(['NGN', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency specified'),
  body('settings.timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('settings.language')
    .optional()
    .isIn(['en', 'yo', 'ig', 'ha'])
    .withMessage('Invalid language specified'),
  handleValidationErrors,
], churchController.createChurch);

// @route   GET /api/churches
// @desc    Get all churches (with optional filtering)
// @access  Public
router.get('/', churchController.getAllChurches);

// @route   GET /api/churches/search
// @desc    Search churches by location, denomination, etc.
// @access  Public
router.get('/search', churchController.searchChurches);

// @route   GET /api/churches/:id
// @desc    Get church by ID
// @access  Public
router.get('/:id', [
  validateObjectId('id'),
], churchController.getChurchById);

// @route   PUT /api/churches/:id
// @desc    Update church
// @access  Private (Church Admin)
router.put('/:id', [
  protect,
  checkChurchAccess,
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Church name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('address.city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('City must be between 2 and 100 characters'),
  body('address.state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('State must be between 2 and 100 characters'),
  body('contact.phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('contact.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('contact.website')
    .optional()
    .isURL()
    .withMessage('Please provide a valid website URL'),
  handleValidationErrors,
], churchController.updateChurch);

// @route   DELETE /api/churches/:id
// @desc    Delete church
// @access  Private (Church Admin)
router.delete('/:id', [
  protect,
  checkChurchAccess,
], churchController.deleteChurch);

// @route   POST /api/churches/:id/services
// @desc    Add a new service to church
// @access  Private (Church Admin)
router.post('/:id/services', [
  protect,
  checkChurchAccess,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),
  body('day')
    .isIn(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
    .withMessage('Invalid day specified'),
  body('time')
    .trim()
    .notEmpty()
    .withMessage('Service time is required'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Service description cannot exceed 200 characters'),
  handleValidationErrors,
], churchController.addService);

// @route   PUT /api/churches/:id/services/:serviceId
// @desc    Update a church service
// @access  Private (Church Admin)
router.put('/:id/services/:serviceId', [
  protect,
  checkChurchAccess,
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Service name must be between 2 and 100 characters'),
  body('day')
    .optional()
    .isIn(['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'])
    .withMessage('Invalid day specified'),
  body('time')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Service time cannot be empty'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Service description cannot exceed 200 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors,
], churchController.updateService);

// @route   DELETE /api/churches/:id/services/:serviceId
// @desc    Remove a church service
// @access  Private (Church Admin)
router.delete('/:id/services/:serviceId', [
  protect,
  checkChurchAccess,
], churchController.removeService);

// @route   POST /api/churches/:id/donation-categories
// @desc    Add a new donation category
// @access  Private (Church Admin)
router.post('/:id/donation-categories', [
  protect,
  checkChurchAccess,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Category description cannot exceed 200 characters'),
  body('defaultAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Default amount must be a positive number'),
  handleValidationErrors,
], churchController.addDonationCategory);

// @route   PUT /api/churches/:id/donation-categories/:categoryId
// @desc    Update a donation category
// @access  Private (Church Admin)
router.put('/:id/donation-categories/:categoryId', [
  protect,
  checkChurchAccess,
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Category name must be between 2 and 50 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Category description cannot exceed 200 characters'),
  body('defaultAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Default amount must be a positive number'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors,
], churchController.updateDonationCategory);

// @route   DELETE /api/churches/:id/donation-categories/:categoryId
// @desc    Remove a donation category
// @access  Private (Church Admin)
router.delete('/:id/donation-categories/:categoryId', [
  protect,
  checkChurchAccess,
], churchController.removeDonationCategory);

// @route   PUT /api/churches/:id/settings
// @desc    Update church settings
// @access  Private (Church Admin)
router.put('/:id/settings', [
  protect,
  checkChurchAccess,
  sanitizeInput,
  body('currency')
    .optional()
    .isIn(['NGN', 'USD', 'EUR', 'GBP'])
    .withMessage('Invalid currency specified'),
  body('timezone')
    .optional()
    .isString()
    .withMessage('Timezone must be a string'),
  body('language')
    .optional()
    .isIn(['en', 'yo', 'ig', 'ha'])
    .withMessage('Invalid language specified'),
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
  body('privacy.publicDirectory')
    .optional()
    .isBoolean()
    .withMessage('Public directory setting must be a boolean'),
  body('privacy.showDonations')
    .optional()
    .isBoolean()
    .withMessage('Show donations setting must be a boolean'),
  body('privacy.showAttendance')
    .optional()
    .isBoolean()
    .withMessage('Show attendance setting must be a boolean'),
  handleValidationErrors,
], churchController.updateSettings);

// @route   PUT /api/churches/:id/financial
// @desc    Update church financial information
// @access  Private (Church Admin)
router.put('/:id/financial', [
  protect,
  checkChurchAccess,
  sanitizeInput,
  body('accountNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Account number cannot exceed 20 characters'),
  body('bankName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bank name cannot exceed 100 characters'),
  body('monnifyContractCode')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Monnify contract code cannot exceed 100 characters'),
  handleValidationErrors,
], churchController.updateFinancialInfo);

// @route   GET /api/churches/:id/stats
// @desc    Get church statistics
// @access  Private (Church Members)
router.get('/:id/stats', [
  protect,
  checkChurchAccess,
], churchController.getChurchStats);

// @route   POST /api/churches/:id/stats/update
// @desc    Update church statistics
// @access  Private (Church Admin)
router.post('/:id/stats/update', [
  protect,
  checkChurchAccess,
], churchController.updateChurchStats);

// @route   GET /api/churches/:id/members
// @desc    Get church members
// @access  Private (Church Members)
router.get('/:id/members', [
  protect,
  checkChurchAccess,
], churchController.getChurchMembers);

// @route   GET /api/churches/:id/volunteer-teams
// @desc    Get church volunteer teams
// @access  Private (Church Members)
router.get('/:id/volunteer-teams', [
  protect,
  checkChurchAccess,
], churchController.getChurchVolunteerTeams);

// @route   GET /api/churches/:id/donations
// @desc    Get church donations
// @access  Private (Church Members)
router.get('/:id/donations', [
  protect,
  checkChurchAccess,
], churchController.getChurchDonations);

// @route   GET /api/churches/:id/expenses
// @desc    Get church expenses
// @access  Private (Church Members)
router.get('/:id/expenses', [
  protect,
  checkChurchAccess,
], churchController.getChurchExpenses);

// @route   GET /api/churches/:id/campaigns
// @desc    Get church donation campaigns
// @access  Private (Church Members)
router.get('/:id/campaigns', [
  protect,
  checkChurchAccess,
], churchController.getChurchCampaigns);

// @route   POST /api/churches/:id/upload-logo
// @desc    Upload church logo
// @access  Private (Church Admin)
router.post('/:id/upload-logo', [
  protect,
  checkChurchAccess,
], churchController.uploadLogo);

// @route   POST /api/churches/:id/upload-banner
// @desc    Upload church banner
// @access  Private (Church Admin)
router.post('/:id/upload-banner', [
  protect,
  checkChurchAccess,
], churchController.uploadBanner);

// @route   DELETE /api/churches/:id/logo
// @desc    Remove church logo
// @access  Private (Church Admin)
router.delete('/:id/logo', [
  protect,
  checkChurchAccess,
], churchController.removeLogo);

// @route   DELETE /api/churches/:id/banner
// @desc    Remove church banner
// @access  Private (Church Admin)
router.delete('/:id/banner', [
  protect,
  checkChurchAccess,
], churchController.removeBanner);

module.exports = router;
