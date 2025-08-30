const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const campaignController = require("../controllers/campaignController");
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
const { canCreateCampaign } = require("../middleware/subscription");
const DonationCampaign = require("../models/DonationCampaign");

// @route   POST /api/campaigns
// @desc    Create a new donation campaign
// @access  Private (Church Admin)
router.post(
  "/",
  [
    protect,
    canCreateCampaign,
    sanitizeInput,
    body("churchId").isMongoId().withMessage("Valid church ID is required"),
    body("title")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Campaign title must be between 5 and 200 characters"),
    body("description")
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage(
        "Campaign description must be between 20 and 2000 characters"
      ),
    body("category")
      .isIn([
        "building",
        "missionary",
        "charity",
        "equipment",
        "event",
        "general",
        "other",
      ])
      .withMessage("Invalid campaign category specified"),
    body("targetAmount")
      .isFloat({ min: 1000 })
      .withMessage("Target amount must be at least 1000"),
    body("startDate").isISO8601().withMessage("Valid start date is required"),
    body("endDate").isISO8601().withMessage("Valid end date is required"),
    body("isUrgent")
      .optional()
      .isBoolean()
      .withMessage("isUrgent must be a boolean"),
    body("isFeatured")
      .optional()
      .isBoolean()
      .withMessage("isFeatured must be a boolean"),
    body("settings.allowAnonymous")
      .optional()
      .isBoolean()
      .withMessage("Allow anonymous must be a boolean"),
    body("settings.allowRecurring")
      .optional()
      .isBoolean()
      .withMessage("Allow recurring must be a boolean"),
    body("settings.minAmount")
      .optional()
      .isFloat({ min: 100 })
      .withMessage("Minimum amount must be at least 100"),
    body("settings.maxAmount")
      .optional()
      .isFloat({ min: 1000 })
      .withMessage("Maximum amount must be at least 1000"),
    body("settings.allowComments")
      .optional()
      .isBoolean()
      .withMessage("Allow comments must be a boolean"),
    handleValidationErrors,
  ],
  campaignController.createCampaign
);

// @route   GET /api/campaigns
// @desc    Get all campaigns (with filtering)
// @access  Public
router.get("/", campaignController.getAllCampaigns);

// @route   GET /api/campaigns/search
// @desc    Search campaigns by title, category, etc.
// @access  Public
router.get("/search", campaignController.searchCampaigns);

// @route   GET /api/campaigns/church/:churchId
// @desc    Get campaigns for a specific church
// @access  Public
router.get("/church/:churchId", campaignController.getCampaignsByChurch);

// @route   GET /api/campaigns/:id
// @desc    Get campaign by ID
// @access  Public
router.get(
  "/:id",
  [validateObjectId("id")],
  campaignController.getCampaignById
);

// @route   PUT /api/campaigns/:id
// @desc    Update campaign
// @access  Private (Church Admin)
router.put(
  "/:id",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("title")
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Campaign title must be between 5 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage(
        "Campaign description must be between 20 and 2000 characters"
      ),
    body("category")
      .optional()
      .isIn([
        "building",
        "missionary",
        "charity",
        "equipment",
        "event",
        "general",
        "other",
      ])
      .withMessage("Invalid campaign category specified"),
    body("targetAmount")
      .optional()
      .isFloat({ min: 1000 })
      .withMessage("Target amount must be at least 1000"),
    body("startDate")
      .optional()
      .isISO8601()
      .withMessage("Valid start date is required"),
    body("endDate")
      .optional()
      .isISO8601()
      .withMessage("Valid end date is required"),
    body("isUrgent")
      .optional()
      .isBoolean()
      .withMessage("isUrgent must be a boolean"),
    body("isFeatured")
      .optional()
      .isBoolean()
      .withMessage("isFeatured must be a boolean"),
    handleValidationErrors,
  ],
  campaignController.updateCampaign
);

// @route   DELETE /api/campaigns/:id
// @desc    Delete campaign
// @access  Private (Church Admin)
router.delete(
  "/:id",
  [protect, validateObjectId("id"), checkResourceAccess(DonationCampaign)],
  campaignController.deleteCampaign
);

// @route   POST /api/campaigns/:id/approve
// @desc    Approve campaign
// @access  Private (Church Admin)
router.post(
  "/:id/approve",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Approval notes cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  campaignController.approveCampaign
);

// @route   POST /api/campaigns/:id/pause
// @desc    Pause campaign
// @access  Private (Church Admin)
router.post(
  "/:id/pause",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("reason")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Pause reason must be between 10 and 500 characters"),
    handleValidationErrors,
  ],
  campaignController.pauseCampaign
);

// @route   POST /api/campaigns/:id/resume
// @desc    Resume campaign
// @access  Private (Church Admin)
router.post(
  "/:id/resume",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Resume notes cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  campaignController.resumeCampaign
);

// @route   POST /api/campaigns/:id/cancel
// @desc    Cancel campaign
// @access  Private (Church Admin)
router.post(
  "/:id/cancel",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("reason")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Cancellation reason must be between 10 and 500 characters"),
    handleValidationErrors,
  ],
  campaignController.cancelCampaign
);

// @route   POST /api/campaigns/:id/images
// @desc    Add image to campaign
// @access  Private (Church Admin)
router.post(
  "/:id/images",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
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
    body("isPrimary")
      .optional()
      .isBoolean()
      .withMessage("isPrimary must be a boolean"),
    body("altText")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Alt text cannot exceed 200 characters"),
    handleValidationErrors,
  ],
  campaignController.addImage
);

// @route   DELETE /api/campaigns/:id/images/:filename
// @desc    Remove image from campaign
// @access  Private (Church Admin)
router.delete(
  "/:id/images/:filename",
  [protect, validateObjectId("id"), checkResourceAccess(DonationCampaign)],
  campaignController.removeImage
);

// @route   POST /api/campaigns/:id/images/:filename/primary
// @desc    Set image as primary
// @access  Private (Church Admin)
router.post(
  "/:id/images/:filename/primary",
  [protect, validateObjectId("id"), checkResourceAccess(DonationCampaign)],
  campaignController.setPrimaryImage
);

// @route   POST /api/campaigns/:id/video
// @desc    Add video to campaign
// @access  Private (Church Admin)
router.post(
  "/:id/video",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("url").trim().isURL().withMessage("Valid video URL is required"),
    body("platform")
      .isIn(["youtube", "vimeo", "facebook", "instagram", "other"])
      .withMessage("Invalid video platform specified"),
    body("title")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Video title cannot exceed 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Video description cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  campaignController.addVideo
);

// @route   DELETE /api/campaigns/:id/video
// @desc    Remove video from campaign
// @access  Private (Church Admin)
router.delete(
  "/:id/video",
  [protect, validateObjectId("id"), checkResourceAccess(DonationCampaign)],
  campaignController.removeVideo
);

// @route   POST /api/campaigns/:id/updates
// @desc    Add update to campaign
// @access  Private (Church Admin)
router.post(
  "/:id/updates",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("title")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Update title must be between 5 and 200 characters"),
    body("content")
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage("Update content must be between 20 and 2000 characters"),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),
    handleValidationErrors,
  ],
  campaignController.addUpdate
);

// @route   PUT /api/campaigns/:id/updates/:updateId
// @desc    Update campaign update
// @access  Private (Church Admin)
router.put(
  "/:id/updates/:updateId",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("title")
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Update title must be between 5 and 200 characters"),
    body("content")
      .optional()
      .trim()
      .isLength({ min: 20, max: 2000 })
      .withMessage("Update content must be between 20 and 2000 characters"),
    body("isPublic")
      .optional()
      .isBoolean()
      .withMessage("isPublic must be a boolean"),
    handleValidationErrors,
  ],
  campaignController.updateUpdate
);

// @route   DELETE /api/campaigns/:id/updates/:updateId
// @desc    Delete campaign update
// @access  Private (Church Admin)
router.delete(
  "/:id/updates/:updateId",
  [protect, validateObjectId("id"), checkResourceAccess(DonationCampaign)],
  campaignController.deleteUpdate
);

// @route   POST /api/campaigns/:id/milestones
// @desc    Add milestone to campaign
// @access  Private (Church Admin)
router.post(
  "/:id/milestones",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("title")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Milestone title must be between 5 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Milestone description cannot exceed 500 characters"),
    body("targetAmount")
      .isFloat({ min: 100 })
      .withMessage("Target amount must be at least 100"),
    body("isReached")
      .optional()
      .isBoolean()
      .withMessage("isReached must be a boolean"),
    handleValidationErrors,
  ],
  campaignController.addMilestone
);

// @route   PUT /api/campaigns/:id/milestones/:milestoneId
// @desc    Update campaign milestone
// @access  Private (Church Admin)
router.put(
  "/:id/milestones/:milestoneId",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("title")
      .optional()
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Milestone title must be between 5 and 200 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Milestone description cannot exceed 500 characters"),
    body("targetAmount")
      .optional()
      .isFloat({ min: 100 })
      .withMessage("Target amount must be at least 100"),
    body("isReached")
      .optional()
      .isBoolean()
      .withMessage("isReached must be a boolean"),
    handleValidationErrors,
  ],
  campaignController.updateMilestone
);

// @route   DELETE /api/campaigns/:id/milestones/:milestoneId
// @desc    Delete campaign milestone
// @access  Private (Church Admin)
router.delete(
  "/:id/milestones/:milestoneId",
  [protect, validateObjectId("id"), checkResourceAccess(DonationCampaign)],
  campaignController.deleteMilestone
);

// @route   POST /api/campaigns/:id/social-sharing
// @desc    Update social sharing settings
// @access  Private (Church Admin)
router.post(
  "/:id/social-sharing",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("enableSharing")
      .optional()
      .isBoolean()
      .withMessage("Enable sharing must be a boolean"),
    body("shareMessage")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Share message cannot exceed 500 characters"),
    body("hashtags")
      .optional()
      .isArray()
      .withMessage("Hashtags must be an array"),
    body("hashtags.*")
      .optional()
      .trim()
      .isLength({ max: 30 })
      .withMessage("Each hashtag cannot exceed 30 characters"),
    handleValidationErrors,
  ],
  campaignController.updateSocialSharing
);

// @route   POST /api/campaigns/:id/donor-wall
// @desc    Update donor wall settings
// @access  Private (Church Admin)
router.post(
  "/:id/donor-wall",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("enableDonorWall")
      .optional()
      .isBoolean()
      .withMessage("Enable donor wall must be a boolean"),
    body("showAmounts")
      .optional()
      .isBoolean()
      .withMessage("Show amounts must be a boolean"),
    body("showAnonymous")
      .optional()
      .isBoolean()
      .withMessage("Show anonymous must be a boolean"),
    body("wallMessage")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Wall message cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  campaignController.updateDonorWall
);

// @route   POST /api/campaigns/:id/settings
// @desc    Update campaign settings
// @access  Private (Church Admin)
router.post(
  "/:id/settings",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(DonationCampaign),
    sanitizeInput,
    body("allowAnonymous")
      .optional()
      .isBoolean()
      .withMessage("Allow anonymous must be a boolean"),
    body("allowRecurring")
      .optional()
      .isBoolean()
      .withMessage("Allow recurring must be a boolean"),
    body("minAmount")
      .optional()
      .isFloat({ min: 100 })
      .withMessage("Minimum amount must be at least 100"),
    body("maxAmount")
      .optional()
      .isFloat({ min: 1000 })
      .withMessage("Maximum amount must be at least 1000"),
    body("allowComments")
      .optional()
      .isBoolean()
      .withMessage("Allow comments must be a boolean"),
    body("autoClose")
      .optional()
      .isBoolean()
      .withMessage("Auto close must be a boolean"),
    handleValidationErrors,
  ],
  campaignController.updateSettings
);

// @route   POST /api/campaigns/:id/share
// @desc    Increment share count
// @access  Public
router.post(
  "/:id/share",
  [validateObjectId("id")],
  campaignController.incrementShareCount
);

// @route   POST /api/campaigns/:id/view
// @desc    Increment page view count
// @access  Public
router.post(
  "/:id/view",
  [validateObjectId("id")],
  campaignController.incrementPageView
);

// @route   GET /api/campaigns/featured
// @desc    Get featured campaigns
// @access  Public
router.get("/featured", campaignController.getFeaturedCampaigns);

// @route   GET /api/campaigns/urgent
// @desc    Get urgent campaigns
// @access  Public
router.get("/urgent", campaignController.getUrgentCampaigns);

// @route   GET /api/campaigns/category/:category
// @desc    Get campaigns by category
// @access  Public
router.get("/category/:category", campaignController.getCampaignsByCategory);

// @route   GET /api/campaigns/stats/church/:churchId
// @desc    Get campaign statistics for a church
// @access  Private (Church Members)
router.get(
  "/stats/church/:churchId",
  [protect, checkChurchAccess],
  campaignController.getCampaignStats
);

// @route   GET /api/campaigns/export/church/:churchId
// @desc    Export campaigns to CSV/Excel
// @access  Private (Church Members)
router.get(
  "/export/church/:churchId",
  [protect, checkChurchAccess],
  campaignController.exportCampaigns
);

module.exports = router;
