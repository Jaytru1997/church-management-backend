const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const expenseController = require("../controllers/expenseController");
const {
  protect,
  authorize,
  checkChurchAccess,
  checkResourceAccess,
} = require("../middleware/auth");
const {
  handleValidationErrors,
  sanitizeInput,
  validateObjectId,
  validateAmount,
} = require("../middleware/validation");
const Expense = require("../models/Expense");

// @route   POST /api/expenses
// @desc    Create a new expense
// @access  Private (Church Members)
router.post(
  "/",
  [
    protect,
    sanitizeInput,
    validateAmount,
    body("churchId").isMongoId().withMessage("Valid church ID is required"),
    body("title")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Expense title must be between 5 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("category")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Category must be between 2 and 50 characters"),
    body("subcategory")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Subcategory cannot exceed 50 characters"),
    body("expenseDate")
      .isISO8601()
      .withMessage("Valid expense date is required"),
    body("dueDate")
      .optional()
      .isISO8601()
      .withMessage("Valid due date is required"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority specified"),
    body("paymentMethod")
      .isIn(["cash", "bank-transfer", "check", "card", "mobile-money"])
      .withMessage("Invalid payment method specified"),
    body("vendor.name")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Vendor name cannot exceed 200 characters"),
    body("vendor.contactPerson")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Contact person cannot exceed 100 characters"),
    body("vendor.phone")
      .optional()
      .matches(/^0[789][01]\d{8}$/)
      .withMessage("Please provide a valid Nigerian phone number"),
    body("vendor.email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("budget.category")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Budget category cannot exceed 100 characters"),
    body("budget.allocatedAmount")
      .optional()
      .isFloat({ min: 0 })
      .withMessage("Allocated amount must be a positive number"),
    handleValidationErrors,
  ],
  expenseController.createExpense
);

// @route   GET /api/expenses
// @desc    Get all expenses (with filtering)
// @access  Private (Church Members)
router.get("/", [protect], expenseController.getAllExpenses);

// @route   GET /api/expenses/church/:churchId
// @desc    Get expenses for a specific church
// @access  Private (Church Members)
router.get(
  "/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.getExpensesByChurch
);

// @route   GET /api/expenses/:id
// @desc    Get expense by ID
// @access  Private (Church Members)
router.get(
  "/:id",
  [protect, validateObjectId("id"), checkResourceAccess(Expense)],
  expenseController.getExpenseById
);

// @route   PUT /api/expenses/:id
// @desc    Update expense
// @access  Private (Church Admin)
router.put(
  "/:id",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("title")
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Expense title must be between 5 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("category")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Category must be between 2 and 50 characters"),
    body("subcategory")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Subcategory cannot exceed 50 characters"),
    body("priority")
      .optional()
      .isIn(["low", "medium", "high", "urgent"])
      .withMessage("Invalid priority specified"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
    body("tags").optional().isArray().withMessage("Tags must be an array"),
    body("tags.*")
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage("Each tag cannot exceed 30 characters"),
    handleValidationErrors,
  ],
  expenseController.updateExpense
);

// @route   DELETE /api/expenses/:id
// @desc    Delete expense
// @access  Private (Church Admin)
router.delete(
  "/:id",
  [protect, validateObjectId("id"), checkResourceAccess(Expense)],
  expenseController.deleteExpense
);

// @route   POST /api/expenses/:id/approve
// @desc    Approve expense
// @access  Private (Church Admin)
router.post(
  "/:id/approve",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("approvedAmount")
      .optional()
      .isFloat({ min: 0.01 })
      .withMessage("Approved amount must be greater than 0"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Approval notes cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  expenseController.approveExpense
);

// @route   POST /api/expenses/:id/reject
// @desc    Reject expense
// @access  Private (Church Admin)
router.post(
  "/:id/reject",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("rejectionReason")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Rejection reason must be between 10 and 500 characters"),
    handleValidationErrors,
  ],
  expenseController.rejectExpense
);

// @route   POST /api/expenses/:id/mark-paid
// @desc    Mark expense as paid
// @access  Private (Church Admin)
router.post(
  "/:id/mark-paid",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("paymentDate")
      .isISO8601()
      .withMessage("Valid payment date is required"),
    body("paymentReference")
      .optional()
      .trim()
      .isLength({ max: 100 })
      .withMessage("Payment reference cannot exceed 100 characters"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Payment notes cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  expenseController.markExpenseAsPaid
);

// @route   POST /api/expenses/:id/attachments
// @desc    Add attachment to expense
// @access  Private (Church Members)
router.post(
  "/:id/attachments",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("filename")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage("Filename is required and cannot exceed 200 characters"),
    body("originalName")
      .trim()
      .isLength({ min: 1, max: 200 })
      .withMessage(
        "Original filename is required and cannot exceed 200 characters"
      ),
    body("mimetype").trim().notEmpty().withMessage("File mimetype is required"),
    body("size")
      .isInt({ min: 1 })
      .withMessage("File size must be a positive number"),
    body("url").trim().isURL().withMessage("Valid file URL is required"),
    handleValidationErrors,
  ],
  expenseController.addAttachment
);

// @route   DELETE /api/expenses/:id/attachments/:filename
// @desc    Remove attachment from expense
// @access  Private (Church Members)
router.delete(
  "/:id/attachments/:filename",
  [protect, validateObjectId("id"), checkResourceAccess(Expense)],
  expenseController.removeAttachment
);

// @route   POST /api/expenses/:id/notes
// @desc    Add note to expense
// @access  Private (Church Members)
router.post(
  "/:id/notes",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("content")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Note content must be between 10 and 500 characters"),
    body("category")
      .isIn(["general", "approval", "payment", "follow-up", "other"])
      .withMessage("Invalid note category specified"),
    handleValidationErrors,
  ],
  expenseController.addNote
);

// @route   PUT /api/expenses/:id/notes/:noteId
// @desc    Update expense note
// @access  Private (Church Members)
router.put(
  "/:id/notes/:noteId",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("content")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Note content must be between 10 and 500 characters"),
    body("category")
      .optional()
      .isIn(["general", "approval", "payment", "follow-up", "other"])
      .withMessage("Invalid note category specified"),
    handleValidationErrors,
  ],
  expenseController.updateNote
);

// @route   DELETE /api/expenses/:id/notes/:noteId
// @desc    Delete expense note
// @access  Private (Church Members)
router.delete(
  "/:id/notes/:noteId",
  [protect, validateObjectId("id"), checkResourceAccess(Expense)],
  expenseController.deleteNote
);

// @route   POST /api/expenses/:id/tags
// @desc    Add tags to expense
// @access  Private (Church Admin)
router.post(
  "/:id/tags",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("tags")
      .isArray({ min: 1 })
      .withMessage("At least one tag is required"),
    body("tags.*")
      .trim()
      .isLength({ min: 1, max: 30 })
      .withMessage("Each tag must be between 1 and 30 characters"),
    handleValidationErrors,
  ],
  expenseController.addTags
);

// @route   DELETE /api/expenses/:id/tags
// @desc    Remove tags from expense
// @access  Private (Church Admin)
router.delete(
  "/:id/tags",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("tags")
      .isArray({ min: 1 })
      .withMessage("At least one tag is required"),
    handleValidationErrors,
  ],
  expenseController.removeTags
);

// @route   GET /api/expenses/stats/church/:churchId
// @desc    Get expense statistics for a church
// @access  Private (Church Members)
router.get(
  "/stats/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.getExpenseStats
);

// @route   GET /api/expenses/totals/church/:churchId
// @desc    Get total expenses for a church
// @access  Private (Church Members)
router.get(
  "/totals/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.getTotalExpenses
);

// @route   GET /api/expenses/by-category/church/:churchId
// @desc    Get expenses grouped by category for a church
// @access  Private (Church Members)
router.get(
  "/by-category/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.getExpensesByCategory
);

// @route   GET /api/expenses/by-date/church/:churchId
// @desc    Get expenses grouped by date for a church
// @access  Private (Church Members)
router.get(
  "/by-date/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.getExpensesByDate
);

// @route   GET /api/expenses/pending/church/:churchId
// @desc    Get pending expenses for a church
// @access  Private (Church Members)
router.get(
  "/pending/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.getPendingExpenses
);

// @route   GET /api/expenses/approved/church/:churchId
// @desc    Get approved expenses for a church
// @access  Private (Church Members)
router.get(
  "/approved/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.getApprovedExpenses
);

// @route   GET /api/expenses/rejected/church/:churchId
// @desc    Get rejected expenses for a church
// @access  Private (Church Members)
router.get(
  "/rejected/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.getRejectedExpenses
);

// @route   GET /api/expenses/overdue/church/:churchId
// @desc    Get overdue expenses for a church
// @access  Private (Church Members)
router.get(
  "/overdue/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.getOverdueExpenses
);

// @route   POST /api/expenses/bulk-import
// @desc    Bulk import expenses from CSV/Excel
// @access  Private (Church Admin)
router.post(
  "/bulk-import",
  [
    protect,
    sanitizeInput,
    body("churchId").isMongoId().withMessage("Valid church ID is required"),
    body("expenses")
      .isArray({ min: 1 })
      .withMessage("At least one expense is required"),
    body("expenses.*.title")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Each expense title must be between 5 and 200 characters"),
    body("expenses.*.amount")
      .isFloat({ min: 0.01 })
      .withMessage("Each expense amount must be greater than 0"),
    body("expenses.*.category")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Each expense category must be between 2 and 50 characters"),
    body("expenses.*.expenseDate")
      .isISO8601()
      .withMessage("Each expense date must be valid"),
    handleValidationErrors,
  ],
  expenseController.bulkImportExpenses
);

// @route   GET /api/expenses/export/church/:churchId
// @desc    Export expenses to CSV/Excel
// @access  Private (Church Members)
router.get(
  "/export/church/:churchId",
  [protect, checkChurchAccess],
  expenseController.exportExpenses
);

// @route   POST /api/expenses/:id/recurring
// @desc    Set up recurring expense
// @access  Private (Church Admin)
router.post(
  "/:id/recurring",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Expense),
    sanitizeInput,
    body("frequency")
      .isIn(["weekly", "monthly", "quarterly", "yearly"])
      .withMessage("Invalid recurring frequency specified"),
    body("startDate").isISO8601().withMessage("Valid start date is required"),
    body("endDate")
      .optional()
      .isISO8601()
      .withMessage("Valid end date is required"),
    body("maxOccurrences")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Maximum occurrences must be at least 1"),
    handleValidationErrors,
  ],
  expenseController.setupRecurringExpense
);

// @route   DELETE /api/expenses/:id/recurring
// @desc    Remove recurring expense setup
// @access  Private (Church Admin)
router.delete(
  "/:id/recurring",
  [protect, validateObjectId("id"), checkResourceAccess(Expense)],
  expenseController.removeRecurringExpense
);

module.exports = router;
