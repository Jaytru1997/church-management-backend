const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const volunteerTeamController = require("../controllers/volunteerTeamController");
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
} = require("../middleware/validation");
const { canCreateVolunteerTeams } = require("../middleware/subscription");
const VolunteerTeam = require("../models/VolunteerTeam");

// @route   POST /api/volunteer-teams
// @desc    Create a new volunteer team
// @access  Private (Church Members)
router.post(
  "/",
  [
    protect,
    canCreateVolunteerTeams,
    sanitizeInput,
    body("churchId").isMongoId().withMessage("Valid church ID is required"),
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Team name must be between 2 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("category")
      .isIn([
        "worship",
        "ushering",
        "technical",
        "children",
        "youth",
        "outreach",
        "administration",
        "maintenance",
        "other",
      ])
      .withMessage("Invalid team category specified"),
    body("leader.userId")
      .isMongoId()
      .withMessage("Valid leader user ID is required"),
    body("leader.name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Leader name must be between 2 and 100 characters"),
    body("leader.phone")
      .optional()
      .matches(/^0[789][01]\d{8}$/)
      .withMessage("Please provide a valid Nigerian phone number"),
    body("leader.email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("requirements.minimumMembers")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Minimum members must be at least 1"),
    body("requirements.skills")
      .optional()
      .isArray()
      .withMessage("Skills must be an array"),
    body("requirements.trainingRequired")
      .optional()
      .isBoolean()
      .withMessage("Training required must be a boolean"),
    handleValidationErrors,
  ],
  volunteerTeamController.createVolunteerTeam
);

// @route   GET /api/volunteer-teams
// @desc    Get all volunteer teams (with filtering)
// @access  Private (Church Members)
router.get("/", [protect], volunteerTeamController.getAllVolunteerTeams);

// @route   GET /api/volunteer-teams/church/:churchId
// @desc    Get volunteer teams for a specific church
// @access  Private (Church Members)
router.get(
  "/church/:churchId",
  [protect, checkChurchAccess],
  volunteerTeamController.getVolunteerTeamsByChurch
);

// @route   GET /api/volunteer-teams/:id
// @desc    Get volunteer team by ID
// @access  Private (Church Members)
router.get(
  "/:id",
  [protect, validateObjectId("id"), checkResourceAccess(VolunteerTeam)],
  volunteerTeamController.getVolunteerTeamById
);

// @route   PUT /api/volunteer-teams/:id
// @desc    Update volunteer team
// @access  Private (Church Admin)
router.put(
  "/:id",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("name")
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Team name must be between 2 and 100 characters"),
    body("description")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Description cannot exceed 500 characters"),
    body("category")
      .optional()
      .isIn([
        "worship",
        "ushering",
        "technical",
        "children",
        "youth",
        "outreach",
        "administration",
        "maintenance",
        "other",
      ])
      .withMessage("Invalid team category specified"),
    body("isActive")
      .optional()
      .isBoolean()
      .withMessage("isActive must be a boolean"),
    handleValidationErrors,
  ],
  volunteerTeamController.updateVolunteerTeam
);

// @route   DELETE /api/volunteer-teams/:id
// @desc    Delete volunteer team
// @access  Private (Church Admin)
router.delete(
  "/:id",
  [protect, validateObjectId("id"), checkResourceAccess(VolunteerTeam)],
  volunteerTeamController.deleteVolunteerTeam
);

// @route   POST /api/volunteer-teams/:id/members
// @desc    Add member to volunteer team
// @access  Private (Church Members)
router.post(
  "/:id/members",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("memberId").isMongoId().withMessage("Valid member ID is required"),
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Member name must be between 2 and 100 characters"),
    body("role")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Team role must be between 2 and 50 characters"),
    body("skills").optional().isArray().withMessage("Skills must be an array"),
    body("availability")
      .optional()
      .isArray()
      .withMessage("Availability must be an array"),
    handleValidationErrors,
  ],
  volunteerTeamController.addMemberToTeam
);

// @route   PUT /api/volunteer-teams/:id/members/:memberId
// @desc    Update member's role in volunteer team
// @access  Private (Church Members)
router.put(
  "/:id/members/:memberId",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("role")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Team role must be between 2 and 50 characters"),
    body("skills").optional().isArray().withMessage("Skills must be an array"),
    body("availability")
      .optional()
      .isArray()
      .withMessage("Availability must be an array"),
    handleValidationErrors,
  ],
  volunteerTeamController.updateMemberRole
);

// @route   DELETE /api/volunteer-teams/:id/members/:memberId
// @desc    Remove member from volunteer team
// @access  Private (Church Members)
router.delete(
  "/:id/members/:memberId",
  [protect, validateObjectId("id"), checkResourceAccess(VolunteerTeam)],
  volunteerTeamController.removeMemberFromTeam
);

// @route   POST /api/volunteer-teams/:id/schedule
// @desc    Add schedule to volunteer team
// @access  Private (Church Members)
router.post(
  "/:id/schedule",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("serviceDate")
      .isISO8601()
      .withMessage("Valid service date is required"),
    body("serviceType")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Service type must be between 2 and 50 characters"),
    body("startTime").trim().notEmpty().withMessage("Start time is required"),
    body("endTime").trim().notEmpty().withMessage("End time is required"),
    body("requiredMembers")
      .isInt({ min: 1 })
      .withMessage("Required members must be at least 1"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Schedule notes cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  volunteerTeamController.addSchedule
);

// @route   PUT /api/volunteer-teams/:id/schedule/:scheduleId
// @desc    Update volunteer team schedule
// @access  Private (Church Members)
router.put(
  "/:id/schedule/:scheduleId",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("serviceDate")
      .optional()
      .isISO8601()
      .withMessage("Valid service date is required"),
    body("serviceType")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Service type must be between 2 and 50 characters"),
    body("startTime")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("Start time cannot be empty"),
    body("endTime")
      .optional()
      .trim()
      .notEmpty()
      .withMessage("End time cannot be empty"),
    body("requiredMembers")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Required members must be at least 1"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Schedule notes cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  volunteerTeamController.updateSchedule
);

// @route   DELETE /api/volunteer-teams/:id/schedule/:scheduleId
// @desc    Remove schedule from volunteer team
// @access  Private (Church Members)
router.delete(
  "/:id/schedule/:scheduleId",
  [protect, validateObjectId("id"), checkResourceAccess(VolunteerTeam)],
  volunteerTeamController.removeSchedule
);

// @route   POST /api/volunteer-teams/:id/schedule/:scheduleId/assign
// @desc    Assign member to schedule
// @access  Private (Church Members)
router.post(
  "/:id/schedule/:scheduleId/assign",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("memberId").isMongoId().withMessage("Valid member ID is required"),
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Member name must be between 2 and 100 characters"),
    body("role")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Schedule role must be between 2 and 50 characters"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Notes cannot exceed 200 characters"),
    handleValidationErrors,
  ],
  volunteerTeamController.assignMemberToSchedule
);

// @route   PUT /api/volunteer-teams/:id/schedule/:scheduleId/assignments/:assignmentId
// @desc    Update member assignment in schedule
// @access  Private (Church Members)
router.put(
  "/:id/schedule/:scheduleId/assignments/:assignmentId",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("role")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Schedule role must be between 2 and 50 characters"),
    body("status")
      .optional()
      .isIn(["assigned", "confirmed", "declined", "completed"])
      .withMessage("Invalid assignment status specified"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Notes cannot exceed 200 characters"),
    handleValidationErrors,
  ],
  volunteerTeamController.updateMemberAssignment
);

// @route   DELETE /api/volunteer-teams/:id/schedule/:scheduleId/assignments/:assignmentId
// @desc    Remove member assignment from schedule
// @access  Private (Church Members)
router.delete(
  "/:id/schedule/:scheduleId/assignments/:assignmentId",
  [protect, validateObjectId("id"), checkResourceAccess(VolunteerTeam)],
  volunteerTeamController.removeMemberAssignment
);

// @route   PUT /api/volunteer-teams/:id/leader
// @desc    Update team leader
// @access  Private (Church Admin)
router.put(
  "/:id/leader",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("userId").isMongoId().withMessage("Valid user ID is required"),
    body("name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Leader name must be between 2 and 100 characters"),
    body("phone")
      .optional()
      .matches(/^0[789][01]\d{8}$/)
      .withMessage("Please provide a valid Nigerian phone number"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    handleValidationErrors,
  ],
  volunteerTeamController.updateTeamLeader
);

// @route   PUT /api/volunteer-teams/:id/requirements
// @desc    Update team requirements
// @access  Private (Church Admin)
router.put(
  "/:id/requirements",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("minimumMembers")
      .optional()
      .isInt({ min: 1 })
      .withMessage("Minimum members must be at least 1"),
    body("skills").optional().isArray().withMessage("Skills must be an array"),
    body("trainingRequired")
      .optional()
      .isBoolean()
      .withMessage("Training required must be a boolean"),
    body("trainingDescription")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Training description cannot exceed 500 characters"),
    body("ageRequirement.min")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Minimum age cannot be negative"),
    body("ageRequirement.max")
      .optional()
      .isInt({ min: 0 })
      .withMessage("Maximum age cannot be negative"),
    handleValidationErrors,
  ],
  volunteerTeamController.updateTeamRequirements
);

// @route   GET /api/volunteer-teams/:id/available-members
// @desc    Get available members for a schedule
// @access  Private (Church Members)
router.get(
  "/:id/available-members",
  [protect, validateObjectId("id"), checkResourceAccess(VolunteerTeam)],
  volunteerTeamController.getAvailableMembers
);

// @route   GET /api/volunteer-teams/:id/performance
// @desc    Get team performance metrics
// @access  Private (Church Members)
router.get(
  "/:id/performance",
  [protect, validateObjectId("id"), checkResourceAccess(VolunteerTeam)],
  volunteerTeamController.evaluateTeamPerformance
);

// @route   POST /api/volunteer-teams/:id/evaluate
// @desc    Evaluate team performance
// @access  Private (Church Admin)
router.post(
  "/:id/evaluate",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(VolunteerTeam),
    sanitizeInput,
    body("memberSatisfaction")
      .optional()
      .isFloat({ min: 0, max: 5 })
      .withMessage("Member satisfaction must be between 0 and 5"),
    handleValidationErrors,
  ],
  volunteerTeamController.evaluatePerformance
);

// @route   GET /api/volunteer-teams/category/:category
// @desc    Get volunteer teams by category
// @access  Private (Church Members)
router.get(
  "/category/:category",
  [protect],
  volunteerTeamController.getTeamsByCategory
);

// @route   GET /api/volunteer-teams/upcoming-schedules/church/:churchId
// @desc    Get teams with upcoming schedules
// @access  Private (Church Members)
router.get(
  "/upcoming-schedules/church/:churchId",
  [protect, checkChurchAccess],
  volunteerTeamController.getUpcomingSchedules
);

// @route   GET /api/volunteer-teams/today-schedules/church/:churchId
// @desc    Get teams with today's schedules
// @access  Private (Church Members)
router.get(
  "/today-schedules/church/:churchId",
  [protect, checkChurchAccess],
  volunteerTeamController.getTodaySchedules
);

// @route   POST /api/volunteer-teams/bulk-import
// @desc    Bulk import volunteer teams from CSV/Excel
// @access  Private (Church Admin)
router.post(
  "/bulk-import",
  [
    protect,
    sanitizeInput,
    body("churchId").isMongoId().withMessage("Valid church ID is required"),
    body("teams")
      .isArray({ min: 1 })
      .withMessage("At least one team is required"),
    body("teams.*.name")
      .trim()
      .isLength({ min: 2, max: 100 })
      .withMessage("Each team name must be between 2 and 100 characters"),
    body("teams.*.category")
      .isIn([
        "worship",
        "ushering",
        "technical",
        "children",
        "youth",
        "outreach",
        "administration",
        "maintenance",
        "other",
      ])
      .withMessage("Each team category must be valid"),
    handleValidationErrors,
  ],
  volunteerTeamController.bulkImportTeams
);

// @route   GET /api/volunteer-teams/export/church/:churchId
// @desc    Export volunteer teams to CSV/Excel
// @access  Private (Church Members)
router.get(
  "/export/church/:churchId",
  [protect, checkChurchAccess],
  volunteerTeamController.exportTeams
);

module.exports = router;
