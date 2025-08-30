const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const subscriptionController = require("../controllers/subscriptionController");
const { protect, authorize } = require("../middleware/auth");
const {
  handleValidationErrors,
  sanitizeInput,
} = require("../middleware/validation");

// @route   GET /api/subscriptions/plans
// @desc    Get available subscription plans
// @access  Public
router.get("/plans", subscriptionController.getAvailablePlans);

// @route   GET /api/subscriptions/current
// @desc    Get user's current subscription
// @access  Private
router.get("/current", protect, subscriptionController.getCurrentSubscription);

// @route   GET /api/subscriptions/usage
// @desc    Get user's subscription usage summary
// @access  Private
router.get("/usage", protect, subscriptionController.getUsageSummary);

// @route   POST /api/subscriptions/subscribe
// @desc    Subscribe to a plan
// @access  Private
router.post(
  "/subscribe",
  [
    protect,
    sanitizeInput,
    body("subscriptionName")
      .isIn(["free", "starter", "organisation"])
      .withMessage("Invalid subscription plan"),
    body("billingCycle")
      .optional()
      .isIn(["monthly", "yearly"])
      .withMessage("Billing cycle must be monthly or yearly"),
    body("paymentMethod")
      .optional()
      .isIn(["card", "bank-transfer", "monnify", "other"])
      .withMessage("Invalid payment method"),
    handleValidationErrors,
  ],
  subscriptionController.subscribeToPlan
);

// @route   PUT /api/subscriptions/upgrade
// @desc    Upgrade subscription
// @access  Private
router.put(
  "/upgrade",
  [
    protect,
    sanitizeInput,
    body("subscriptionName")
      .isIn(["starter", "organisation"])
      .withMessage("Invalid subscription plan for upgrade"),
    body("billingCycle")
      .optional()
      .isIn(["monthly", "yearly"])
      .withMessage("Billing cycle must be monthly or yearly"),
    body("paymentMethod")
      .optional()
      .isIn(["card", "bank-transfer", "monnify", "other"])
      .withMessage("Invalid payment method"),
    handleValidationErrors,
  ],
  subscriptionController.upgradeSubscription
);

// @route   PUT /api/subscriptions/cancel
// @desc    Cancel subscription
// @access  Private
router.put(
  "/cancel",
  [
    protect,
    sanitizeInput,
    body("reason")
      .optional()
      .isLength({ max: 500 })
      .withMessage("Reason cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  subscriptionController.cancelSubscription
);

// @route   PUT /api/subscriptions/renew
// @desc    Renew subscription
// @access  Private
router.put(
  "/renew",
  [
    protect,
    sanitizeInput,
    body("billingCycle")
      .isIn(["monthly", "yearly"])
      .withMessage("Billing cycle must be monthly or yearly"),
    handleValidationErrors,
  ],
  subscriptionController.renewSubscription
);

// @route   GET /api/subscriptions/billing-history
// @desc    Get subscription billing history
// @access  Private
router.get(
  "/billing-history",
  protect,
  subscriptionController.getBillingHistory
);

// @route   POST /api/subscriptions/process-payment
// @desc    Process subscription payment
// @access  Private
router.post(
  "/process-payment",
  [
    protect,
    sanitizeInput,
    body("subscriptionName")
      .isIn(["free", "starter", "organisation"])
      .withMessage("Invalid subscription plan"),
    body("billingCycle")
      .isIn(["monthly", "yearly"])
      .withMessage("Billing cycle must be monthly or yearly"),
    body("paymentMethod")
      .isIn(["card", "bank-transfer", "monnify", "other"])
      .withMessage("Invalid payment method"),
    body("paymentDetails.transactionReference")
      .optional()
      .isString()
      .withMessage("Transaction reference must be a string"),
    handleValidationErrors,
  ],
  subscriptionController.processPayment
);

// @route   GET /api/subscriptions/analytics
// @desc    Get subscription analytics (Admin only)
// @access  Private (Admin)
router.get(
  "/analytics",
  [protect, authorize("admin", "super-admin")],
  subscriptionController.getSubscriptionAnalytics
);

module.exports = router;
