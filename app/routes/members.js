const express = require("express");
const { body } = require("express-validator");
const router = express.Router();

const memberController = require("../controllers/memberController");
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
  validateEmail,
  validatePhone,
} = require("../middleware/validation");
const { canAddAdminStaff } = require("../middleware/subscription");
const Member = require("../models/Member");

// @route   POST /api/members
// @desc    Create a new member
// @access  Private (Church Members)
router.post(
  "/",
  [
    protect,
    canAddAdminStaff,
    sanitizeInput,
    body("churchId").isMongoId().withMessage("Valid church ID is required"),
    body("userId").isMongoId().withMessage("Valid user ID is required"),
    body("firstName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters"),
    body("lastName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("phone")
      .optional()
      .matches(/^0[789][01]\d{8}$/)
      .withMessage("Please provide a valid Nigerian phone number"),
    body("dateOfBirth")
      .optional()
      .isISO8601()
      .withMessage("Please provide a valid date of birth"),
    body("gender")
      .optional()
      .isIn(["male", "female"])
      .withMessage("Invalid gender specified"),
    body("maritalStatus")
      .optional()
      .isIn(["single", "married", "divorced", "widowed"])
      .withMessage("Invalid marital status specified"),
    body("role")
      .optional()
      .isIn(["member", "volunteer", "leader"])
      .withMessage("Invalid role specified"),
    body("membership.membershipType")
      .optional()
      .isIn(["regular", "associate", "visitor"])
      .withMessage("Invalid membership type specified"),
    handleValidationErrors,
  ],
  memberController.createMember
);

// @route   GET /api/members
// @desc    Get all members (with filtering)
// @access  Private (Church Members)
router.get("/", [protect], memberController.getAllMembers);

// @route   GET /api/members/church/:churchId
// @desc    Get members for a specific church
// @access  Private (Church Members)
router.get(
  "/church/:churchId",
  [protect, checkChurchAccess],
  memberController.getMembersByChurch
);

// @route   GET /api/members/:id
// @desc    Get member by ID
// @access  Private (Church Members)
router.get(
  "/:id",
  [protect, validateObjectId("id"), checkResourceAccess(Member)],
  memberController.getMemberById
);

// @route   PUT /api/members/:id
// @desc    Update member
// @access  Private (Church Admin)
router.put(
  "/:id",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("firstName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("First name must be between 2 and 50 characters"),
    body("lastName")
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Last name must be between 2 and 50 characters"),
    body("email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Please provide a valid email address"),
    body("phone")
      .optional()
      .matches(/^0[789][01]\d{8}$/)
      .withMessage("Please provide a valid Nigerian phone number"),
    body("role")
      .optional()
      .isIn(["member", "volunteer", "leader"])
      .withMessage("Invalid role specified"),
    handleValidationErrors,
  ],
  memberController.updateMember
);

// @route   DELETE /api/members/:id
// @desc    Delete member
// @access  Private (Church Admin)
router.delete(
  "/:id",
  [protect, validateObjectId("id"), checkResourceAccess(Member)],
  memberController.deleteMember
);

// @route   POST /api/members/:id/attendance
// @desc    Add attendance record
// @access  Private (Church Members)
router.post(
  "/:id/attendance",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("serviceDate")
      .isISO8601()
      .withMessage("Valid service date is required"),
    body("serviceType")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Service type must be between 2 and 50 characters"),
    body("status")
      .isIn(["present", "absent", "late", "excused"])
      .withMessage("Invalid attendance status specified"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Notes cannot exceed 200 characters"),
    handleValidationErrors,
  ],
  memberController.addAttendance
);

// @route   PUT /api/members/:id/attendance/:attendanceId
// @desc    Update attendance record
// @access  Private (Church Members)
router.put(
  "/:id/attendance/:attendanceId",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("status")
      .optional()
      .isIn(["present", "absent", "late", "excused"])
      .withMessage("Invalid attendance status specified"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 200 })
      .withMessage("Notes cannot exceed 200 characters"),
    handleValidationErrors,
  ],
  memberController.updateAttendance
);

// @route   DELETE /api/members/:id/attendance/:attendanceId
// @desc    Remove attendance record
// @access  Private (Church Members)
router.delete(
  "/:id/attendance/:attendanceId",
  [protect, validateObjectId("id"), checkResourceAccess(Member)],
  memberController.removeAttendance
);

// @route   POST /api/members/:id/volunteer-teams
// @desc    Add member to volunteer team
// @access  Private (Church Members)
router.post(
  "/:id/volunteer-teams",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("teamId").isMongoId().withMessage("Valid team ID is required"),
    body("role")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Team role must be between 2 and 50 characters"),
    body("skills").optional().isArray().withMessage("Skills must be an array"),
    body("skills.*")
      .optional()
      .trim()
      .isLength({ max: 50 })
      .withMessage("Each skill cannot exceed 50 characters"),
    body("availability")
      .optional()
      .isArray()
      .withMessage("Availability must be an array"),
    handleValidationErrors,
  ],
  memberController.addVolunteerTeam
);

// @route   PUT /api/members/:id/volunteer-teams/:teamId
// @desc    Update member's volunteer team role
// @access  Private (Church Members)
router.put(
  "/:id/volunteer-teams/:teamId",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
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
  memberController.updateVolunteerTeam
);

// @route   DELETE /api/members/:id/volunteer-teams/:teamId
// @desc    Remove member from volunteer team
// @access  Private (Church Members)
router.delete(
  "/:id/volunteer-teams/:teamId",
  [protect, validateObjectId("id"), checkResourceAccess(Member)],
  memberController.removeVolunteerTeam
);

// @route   POST /api/members/:id/first-timer
// @desc    Mark member as first timer
// @access  Private (Church Members)
router.post(
  "/:id/first-timer",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("firstVisitDate")
      .isISO8601()
      .withMessage("Valid first visit date is required"),
    body("followUpStatus")
      .optional()
      .isIn(["pending", "in-progress", "completed", "no-response"])
      .withMessage("Invalid follow-up status specified"),
    handleValidationErrors,
  ],
  memberController.markAsFirstTimer
);

// @route   POST /api/members/:id/first-timer/follow-up
// @desc    Add follow-up note for first timer
// @access  Private (Church Members)
router.post(
  "/:id/first-timer/follow-up",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("notes")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Follow-up notes must be between 10 and 500 characters"),
    body("nextAction")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Next action must be between 5 and 200 characters"),
    handleValidationErrors,
  ],
  memberController.addFollowUpNote
);

// @route   PUT /api/members/:id/first-timer/status
// @desc    Update first timer follow-up status
// @access  Private (Church Members)
router.put(
  "/:id/first-timer/status",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("followUpStatus")
      .isIn(["pending", "in-progress", "completed", "no-response"])
      .withMessage("Invalid follow-up status specified"),
    body("notes")
      .optional()
      .trim()
      .isLength({ max: 500 })
      .withMessage("Notes cannot exceed 500 characters"),
    handleValidationErrors,
  ],
  memberController.updateFirstTimerStatus
);

// @route   POST /api/members/:id/baptism
// @desc    Record baptism information
// @access  Private (Church Members)
router.post(
  "/:id/baptism",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("baptismDate")
      .isISO8601()
      .withMessage("Valid baptism date is required"),
    body("baptismLocation")
      .trim()
      .isLength({ min: 5, max: 200 })
      .withMessage("Baptism location must be between 5 and 200 characters"),
    handleValidationErrors,
  ],
  memberController.recordBaptism
);

// @route   POST /api/members/:id/notes
// @desc    Add note to member
// @access  Private (Church Members)
router.post(
  "/:id/notes",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("content")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Note content must be between 10 and 500 characters"),
    body("category")
      .isIn(["general", "pastoral", "financial", "attendance", "other"])
      .withMessage("Invalid note category specified"),
    handleValidationErrors,
  ],
  memberController.addNote
);

// @route   PUT /api/members/:id/notes/:noteId
// @desc    Update member note
// @access  Private (Church Members)
router.put(
  "/:id/notes/:noteId",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("content")
      .trim()
      .isLength({ min: 10, max: 500 })
      .withMessage("Note content must be between 10 and 500 characters"),
    body("category")
      .optional()
      .isIn(["general", "pastoral", "financial", "attendance", "other"])
      .withMessage("Invalid note category specified"),
    handleValidationErrors,
  ],
  memberController.updateNote
);

// @route   DELETE /api/members/:id/notes/:noteId
// @desc    Delete member note
// @access  Private (Church Members)
router.delete(
  "/:id/notes/:noteId",
  [protect, validateObjectId("id"), checkResourceAccess(Member)],
  memberController.deleteNote
);

// @route   POST /api/members/:id/skills
// @desc    Add skills to member
// @access  Private (Church Members)
router.post(
  "/:id/skills",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("skills")
      .isArray({ min: 1 })
      .withMessage("At least one skill is required"),
    body("skills.*")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Each skill must be between 2 and 50 characters"),
    handleValidationErrors,
  ],
  memberController.addSkills
);

// @route   DELETE /api/members/:id/skills
// @desc    Remove skills from member
// @access  Private (Church Members)
router.delete(
  "/:id/skills",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("skills")
      .isArray({ min: 1 })
      .withMessage("At least one skill is required"),
    handleValidationErrors,
  ],
  memberController.removeSkills
);

// @route   POST /api/members/:id/interests
// @desc    Add interests to member
// @access  Private (Church Members)
router.post(
  "/:id/interests",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("interests")
      .isArray({ min: 1 })
      .withMessage("At least one interest is required"),
    body("interests.*")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Each interest must be between 2 and 50 characters"),
    handleValidationErrors,
  ],
  memberController.addInterests
);

// @route   DELETE /api/members/:id/interests
// @desc    Remove interests from member
// @access  Private (Church Members)
router.delete(
  "/:id/interests",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("interests")
      .isArray({ min: 1 })
      .withMessage("At least one interest is required"),
    handleValidationErrors,
  ],
  memberController.removeInterests
);

// @route   GET /api/members/attendance/church/:churchId
// @desc    Get attendance statistics for a church
// @access  Private (Church Members)
router.get(
  "/attendance/church/:churchId",
  [protect, checkChurchAccess],
  memberController.getAttendanceStats
);

// @route   GET /api/members/volunteers/church/:churchId
// @desc    Get volunteer members for a church
// @access  Private (Church Members)
router.get(
  "/volunteers/church/:churchId",
  [protect, checkChurchAccess],
  memberController.getVolunteerMembers
);

// @route   GET /api/members/first-timers/church/:churchId
// @desc    Get first timer members for a church
// @access  Private (Church Members)
router.get(
  "/first-timers/church/:churchId",
  [protect, checkChurchAccess],
  memberController.getFirstTimerMembers
);

// @route   POST /api/members/bulk-import
// @desc    Bulk import members from CSV/Excel
// @access  Private (Church Admin)
router.post(
  "/bulk-import",
  [
    protect,
    sanitizeInput,
    body("churchId").isMongoId().withMessage("Valid church ID is required"),
    body("members")
      .isArray({ min: 1 })
      .withMessage("At least one member is required"),
    body("members.*.firstName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Each first name must be between 2 and 50 characters"),
    body("members.*.lastName")
      .trim()
      .isLength({ min: 2, max: 50 })
      .withMessage("Each last name must be between 2 and 50 characters"),
    body("members.*.email")
      .optional()
      .isEmail()
      .normalizeEmail()
      .withMessage("Each email must be valid"),
    handleValidationErrors,
  ],
  memberController.bulkImportMembers
);

// @route   GET /api/members/export/church/:churchId
// @desc    Export members to CSV/Excel
// @access  Private (Church Members)
router.get(
  "/export/church/:churchId",
  [protect, checkChurchAccess],
  memberController.exportMembers
);

// @route   POST /api/members/:id/deactivate
// @desc    Deactivate member account
// @access  Private (Church Admin)
router.post(
  "/:id/deactivate",
  [
    protect,
    validateObjectId("id"),
    checkResourceAccess(Member),
    sanitizeInput,
    body("deactivationReason")
      .trim()
      .isLength({ min: 10, max: 200 })
      .withMessage("Deactivation reason must be between 10 and 200 characters"),
    handleValidationErrors,
  ],
  memberController.deactivateMember
);

// @route   POST /api/members/:id/activate
// @desc    Reactivate member account
// @access  Private (Church Admin)
router.post(
  "/:id/activate",
  [protect, validateObjectId("id"), checkResourceAccess(Member)],
  memberController.activateMember
);

module.exports = router;
