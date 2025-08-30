const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const financialRecordController = require('../controllers/financialRecordController');
const { protect, authorize, checkChurchAccess, checkResourceAccess } = require('../middleware/auth');
const { handleValidationErrors, sanitizeInput, validateObjectId, validateAmount } = require('../middleware/validation');
const ManualFinancialRecord = require('../models/ManualFinancialRecord');

// @route   POST /api/financial-records
// @desc    Create a new manual financial record
// @access  Private (Church Members)
router.post('/', [
  protect,
  sanitizeInput,
  validateAmount,
  body('churchId')
    .isMongoId()
    .withMessage('Valid church ID is required'),
  body('recordType')
    .isIn(['donation', 'expense', 'income', 'transfer', 'adjustment'])
    .withMessage('Invalid record type specified'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Record title must be between 5 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subcategory cannot exceed 100 characters'),
  body('transactionDate')
    .isISO8601()
    .withMessage('Valid transaction date is required'),
  body('source')
    .isIn(['cash', 'bank', 'check', 'mobile-money', 'other'])
    .withMessage('Invalid source specified'),
  body('sourceDetails.bankName')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bank name cannot exceed 100 characters'),
  body('sourceDetails.accountNumber')
    .optional()
    .trim()
    .isLength({ max: 20 })
    .withMessage('Account number cannot exceed 20 characters'),
  body('sourceDetails.reference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Reference cannot exceed 100 characters'),
  body('donor.name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Donor name cannot exceed 200 characters'),
  body('donor.phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('donor.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('vendor.name')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Vendor name cannot exceed 200 characters'),
  body('vendor.contactPerson')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Contact person cannot exceed 100 characters'),
  body('vendor.phone')
    .optional()
    .matches(/^0[789][01]\d{8}$/)
    .withMessage('Please provide a valid Nigerian phone number'),
  body('vendor.email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority specified'),
  handleValidationErrors,
], financialRecordController.createFinancialRecord);

// @route   GET /api/financial-records
// @desc    Get all financial records (with filtering)
// @access  Private (Church Members)
router.get('/', [
  protect,
], financialRecordController.getAllFinancialRecords);

// @route   GET /api/financial-records/church/:churchId
// @desc    Get financial records for a specific church
// @access  Private (Church Members)
router.get('/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getFinancialRecordsByChurch);

// @route   GET /api/financial-records/:id
// @desc    Get financial record by ID
// @access  Private (Church Members)
router.get('/:id', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
], financialRecordController.getFinancialRecordById);

// @route   PUT /api/financial-records/:id
// @desc    Update financial record
// @access  Private (Church Admin)
router.put('/:id', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
  sanitizeInput,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Record title must be between 5 and 200 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('category')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category must be between 2 and 100 characters'),
  body('subcategory')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Subcategory cannot exceed 100 characters'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high', 'urgent'])
    .withMessage('Invalid priority specified'),
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
], financialRecordController.updateFinancialRecord);

// @route   DELETE /api/financial-records/:id
// @desc    Delete financial record
// @access  Private (Church Admin)
router.delete('/:id', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
], financialRecordController.deleteFinancialRecord);

// @route   POST /api/financial-records/:id/verify
// @desc    Verify financial record
// @access  Private (Church Admin)
router.post('/:id/verify', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
  sanitizeInput,
  body('verificationMethod')
    .isIn(['document', 'witness', 'bank-statement', 'receipt', 'other'])
    .withMessage('Invalid verification method specified'),
  body('verificationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Verification notes cannot exceed 500 characters'),
  body('confidence')
    .isIn(['low', 'medium', 'high'])
    .withMessage('Invalid confidence level specified'),
  handleValidationErrors,
], financialRecordController.verifyFinancialRecord);

// @route   POST /api/financial-records/:id/reject
// @desc    Reject financial record
// @access  Private (Church Admin)
router.post('/:id/reject', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
  sanitizeInput,
  body('notes')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Rejection notes must be between 10 and 500 characters'),
  handleValidationErrors,
], financialRecordController.rejectFinancialRecord);

// @route   POST /api/financial-records/:id/reconcile
// @desc    Mark financial record as reconciled
// @access  Private (Church Admin)
router.post('/:id/reconcile', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
  sanitizeInput,
  body('reconciliationNotes')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Reconciliation notes cannot exceed 500 characters'),
  body('bankStatementMatch')
    .optional()
    .isBoolean()
    .withMessage('Bank statement match must be a boolean'),
  body('bankStatementReference')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Bank statement reference cannot exceed 100 characters'),
  handleValidationErrors,
], financialRecordController.reconcileFinancialRecord);

// @route   POST /api/financial-records/:id/attachments
// @desc    Add attachment to financial record
// @access  Private (Church Members)
router.post('/:id/attachments', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
  sanitizeInput,
  body('filename')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Filename is required and cannot exceed 200 characters'),
  body('originalName')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Original filename is required and cannot exceed 200 characters'),
  body('mimetype')
    .trim()
    .notEmpty()
    .withMessage('File mimetype is required'),
  body('size')
    .isInt({ min: 1 })
    .withMessage('File size must be a positive number'),
  body('url')
    .trim()
    .isURL()
    .withMessage('Valid file URL is required'),
  handleValidationErrors,
], financialRecordController.addAttachment);

// @route   DELETE /api/financial-records/:id/attachments/:filename
// @desc    Remove attachment from financial record
// @access  Private (Church Members)
router.delete('/:id/attachments/:filename', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
], financialRecordController.removeAttachment);

// @route   POST /api/financial-records/:id/notes
// @desc    Add note to financial record
// @access  Private (Church Members)
router.post('/:id/notes', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
  sanitizeInput,
  body('content')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Note content must be between 10 and 500 characters'),
  body('type')
    .isIn(['general', 'verification', 'reconciliation', 'follow-up', 'other'])
    .withMessage('Invalid note type specified'),
  handleValidationErrors,
], financialRecordController.addNote);

// @route   PUT /api/financial-records/:id/notes/:noteId
// @desc    Update financial record note
// @access  Private (Church Members)
router.put('/:id/notes/:noteId', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
  sanitizeInput,
  body('content')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Note content must be between 10 and 500 characters'),
  body('type')
    .optional()
    .isIn(['general', 'verification', 'reconciliation', 'follow-up', 'other'])
    .withMessage('Invalid note type specified'),
  handleValidationErrors,
], financialRecordController.updateNote);

// @route   DELETE /api/financial-records/:id/notes/:noteId
// @desc    Delete financial record note
// @access  Private (Church Members)
router.delete('/:id/notes/:noteId', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
], financialRecordController.deleteNote);

// @route   POST /api/financial-records/:id/tags
// @desc    Add tags to financial record
// @access  Private (Church Admin)
router.post('/:id/tags', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
  sanitizeInput,
  body('tags')
    .isArray({ min: 1 })
    .withMessage('At least one tag is required'),
  body('tags.*')
    .trim()
    .isLength({ min: 1, max: 30 })
    .withMessage('Each tag must be between 1 and 30 characters'),
  handleValidationErrors,
], financialRecordController.addTags);

// @route   DELETE /api/financial-records/:id/tags
// @desc    Remove tags from financial record
// @access  Private (Church Admin)
router.delete('/:id/tags', [
  protect,
  validateObjectId('id'),
  checkResourceAccess(ManualFinancialRecord),
  sanitizeInput,
  body('tags')
    .isArray({ min: 1 })
    .withMessage('At least one tag is required'),
  handleValidationErrors,
], financialRecordController.removeTags);

// @route   GET /api/financial-records/stats/church/:churchId
// @desc    Get financial record statistics for a church
// @access  Private (Church Members)
router.get('/stats/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getFinancialRecordStats);

// @route   GET /api/financial-records/totals/church/:churchId
// @desc    Get total financial records for a church
// @access  Private (Church Members)
router.get('/totals/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getTotalFinancialRecords);

// @route   GET /api/financial-records/by-type/church/:churchId
// @desc    Get financial records grouped by type for a church
// @access  Private (Church Members)
router.get('/by-type/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getFinancialRecordsByType);

// @route   GET /api/financial-records/by-date/church/:churchId
// @desc    Get financial records grouped by date for a church
// @access  Private (Church Members)
router.get('/by-date/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getFinancialRecordsByDate);

// @route   GET /api/financial-records/pending/church/:churchId
// @desc    Get pending financial records for a church
// @access  Private (Church Members)
router.get('/pending/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getPendingFinancialRecords);

// @route   GET /api/financial-records/unverified/church/:churchId
// @desc    Get unverified financial records for a church
// @access  Private (Church Members)
router.get('/unverified/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getUnverifiedFinancialRecords);

// @route   GET /api/financial-records/unreconciled/church/:churchId
// @desc    Get unreconciled financial records for a church
// @access  Private (Church Members)
router.get('/unreconciled/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getUnreconciledFinancialRecords);

// @route   GET /api/financial-records/overdue-verification/church/:churchId
// @desc    Get overdue verification financial records for a church
// @access  Private (Church Members)
router.get('/overdue-verification/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getOverdueVerificationRecords);

// @route   POST /api/financial-records/bulk-import
// @desc    Bulk import financial records from CSV/Excel
// @access  Private (Church Admin)
router.post('/bulk-import', [
  protect,
  sanitizeInput,
  body('churchId')
    .isMongoId()
    .withMessage('Valid church ID is required'),
  body('records')
    .isArray({ min: 1 })
    .withMessage('At least one record is required'),
  body('records.*.title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Each record title must be between 5 and 200 characters'),
  body('records.*.amount')
    .isFloat({ min: 0.01 })
    .withMessage('Each record amount must be greater than 0'),
  body('records.*.recordType')
    .isIn(['donation', 'expense', 'income', 'transfer', 'adjustment'])
    .withMessage('Each record type must be valid'),
  body('records.*.category')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Each record category must be between 2 and 100 characters'),
  body('records.*.transactionDate')
    .isISO8601()
    .withMessage('Each transaction date must be valid'),
  handleValidationErrors,
], financialRecordController.bulkImportFinancialRecords);

// @route   GET /api/financial-records/export/church/:churchId
// @desc    Export financial records to CSV/Excel
// @access  Private (Church Members)
router.get('/export/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.exportFinancialRecords);

// @route   GET /api/financial-records/reconciliation-report/church/:churchId
// @desc    Get reconciliation report for a church
// @access  Private (Church Members)
router.get('/reconciliation-report/church/:churchId', [
  protect,
  checkChurchAccess,
], financialRecordController.getReconciliationReport);

module.exports = router;
