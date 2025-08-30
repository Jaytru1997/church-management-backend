const express = require('express');
const { body } = require('express-validator');
const router = express.Router();

const notificationController = require('../controllers/notificationController');
const { protect, authorize, checkChurchAccess } = require('../middleware/auth');
const { handleValidationErrors, sanitizeInput, validateObjectId } = require('../middleware/validation');

// @route   POST /api/notifications/send
// @desc    Send a notification
// @access  Private (Church Admin)
router.post('/send', [
  protect,
  sanitizeInput,
  body('churchId')
    .isMongoId()
    .withMessage('Valid church ID is required'),
  body('type')
    .isIn(['donation', 'expense', 'member', 'volunteer', 'campaign', 'event', 'general', 'urgent'])
    .withMessage('Invalid notification type specified'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Notification title must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Notification message must be between 10 and 1000 characters'),
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('At least one recipient is required'),
  body('recipients.*')
    .isIn(['all', 'members', 'volunteers', 'admins', 'specific'])
    .withMessage('Invalid recipient type specified'),
  body('specificUserIds')
    .optional()
    .isArray()
    .withMessage('Specific user IDs must be an array'),
  body('specificUserIds.*')
    .optional()
    .isMongoId()
    .withMessage('Each specific user ID must be valid'),
  body('channels')
    .isArray({ min: 1 })
    .withMessage('At least one channel is required'),
  body('channels.*')
    .isIn(['email', 'push', 'sms', 'in-app'])
    .withMessage('Invalid channel specified'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority specified'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Valid scheduled date is required'),
  body('expiresAt')
    .optional()
    .isISO8601()
    .withMessage('Valid expiry date is required'),
  handleValidationErrors,
], notificationController.sendNotification);

// @route   POST /api/notifications/send-church
// @desc    Send notification to church members
// @access  Private (Church Admin)
router.post('/send-church', [
  protect,
  checkChurchAccess,
  sanitizeInput,
  body('type')
    .isIn(['donation', 'expense', 'member', 'volunteer', 'campaign', 'event', 'general', 'urgent'])
    .withMessage('Invalid notification type specified'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Notification title must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Notification message must be between 10 and 1000 characters'),
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('At least one recipient is required'),
  body('recipients.*')
    .isIn(['all', 'members', 'volunteers', 'admins'])
    .withMessage('Invalid recipient type specified'),
  body('channels')
    .isArray({ min: 1 })
    .withMessage('At least one channel is required'),
  body('channels.*')
    .isIn(['email', 'push', 'sms', 'in-app'])
    .withMessage('Invalid channel specified'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority specified'),
  handleValidationErrors,
], notificationController.sendChurchNotification);

// @route   POST /api/notifications/send-user
// @desc    Send notification to specific user
// @access  Private (Church Admin)
router.post('/send-user', [
  protect,
  sanitizeInput,
  body('userId')
    .isMongoId()
    .withMessage('Valid user ID is required'),
  body('type')
    .isIn(['donation', 'expense', 'member', 'volunteer', 'campaign', 'event', 'general', 'urgent'])
    .withMessage('Invalid notification type specified'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Notification title must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Notification message must be between 10 and 1000 characters'),
  body('channels')
    .isArray({ min: 1 })
    .withMessage('At least one channel is required'),
  body('channels.*')
    .isIn(['email', 'push', 'sms', 'in-app'])
    .withMessage('Invalid channel specified'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority specified'),
  handleValidationErrors,
], notificationController.sendUserNotification);

// @route   POST /api/notifications/send-team
// @desc    Send notification to volunteer team
// @access  Private (Church Admin)
router.post('/send-team', [
  protect,
  sanitizeInput,
  body('teamId')
    .isMongoId()
    .withMessage('Valid team ID is required'),
  body('type')
    .isIn(['donation', 'expense', 'member', 'volunteer', 'campaign', 'event', 'general', 'urgent'])
    .withMessage('Invalid notification type specified'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Notification title must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Notification message must be between 10 and 1000 characters'),
  body('channels')
    .isArray({ min: 1 })
    .withMessage('At least one channel is required'),
  body('channels.*')
    .isIn(['email', 'push', 'sms', 'in-app'])
    .withMessage('Invalid channel specified'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority specified'),
  handleValidationErrors,
], notificationController.sendTeamNotification);

// @route   GET /api/notifications
// @desc    Get all notifications for current user
// @access  Private
router.get('/', [
  protect,
], notificationController.getUserNotifications);

// @route   GET /api/notifications/church/:churchId
// @desc    Get notifications for a specific church
// @access  Private (Church Members)
router.get('/church/:churchId', [
  protect,
  checkChurchAccess,
], notificationController.getChurchNotifications);

// @route   GET /api/notifications/:id
// @desc    Get notification by ID
// @access  Private
router.get('/:id', [
  protect,
  validateObjectId('id'),
], notificationController.getNotificationById);

// @route   PUT /api/notifications/:id/read
// @desc    Mark notification as read
// @access  Private
router.put('/:id/read', [
  protect,
  validateObjectId('id'),
], notificationController.markAsRead);

// @route   PUT /api/notifications/:id/unread
// @desc    Mark notification as unread
// @access  Private
router.put('/:id/unread', [
  protect,
  validateObjectId('id'),
], notificationController.markAsUnread);

// @route   PUT /api/notifications/:id/archive
// @desc    Archive notification
// @access  Private
router.put('/:id/archive', [
  protect,
  validateObjectId('id'),
], notificationController.archiveNotification);

// @route   PUT /api/notifications/:id/unarchive
// @desc    Unarchive notification
// @access  Private
router.put('/:id/unarchive', [
  protect,
  validateObjectId('id'),
], notificationController.unarchiveNotification);

// @route   DELETE /api/notifications/:id
// @desc    Delete notification
// @access  Private
router.delete('/:id', [
  protect,
  validateObjectId('id'),
], notificationController.deleteNotification);

// @route   POST /api/notifications/bulk-read
// @desc    Mark multiple notifications as read
// @access  Private
router.post('/bulk-read', [
  protect,
  sanitizeInput,
  body('notificationIds')
    .isArray({ min: 1 })
    .withMessage('At least one notification ID is required'),
  body('notificationIds.*')
    .isMongoId()
    .withMessage('Each notification ID must be valid'),
  handleValidationErrors,
], notificationController.bulkMarkAsRead);

// @route   POST /api/notifications/bulk-archive
// @desc    Archive multiple notifications
// @access  Private
router.post('/bulk-archive', [
  protect,
  sanitizeInput,
  body('notificationIds')
    .isArray({ min: 1 })
    .withMessage('At least one notification ID is required'),
  body('notificationIds.*')
    .isMongoId()
    .withMessage('Each notification ID must be valid'),
  handleValidationErrors,
], notificationController.bulkArchive);

// @route   POST /api/notifications/bulk-delete
// @desc    Delete multiple notifications
// @access  Private
router.post('/bulk-delete', [
  protect,
  sanitizeInput,
  body('notificationIds')
    .isArray({ min: 1 })
    .withMessage('At least one notification ID is required'),
  body('notificationIds.*')
    .isMongoId()
    .withMessage('Each notification ID must be valid'),
  handleValidationErrors,
], notificationController.bulkDelete);

// @route   GET /api/notifications/unread/count
// @desc    Get count of unread notifications
// @access  Private
router.get('/unread/count', [
  protect,
], notificationController.getUnreadCount);

// @route   GET /api/notifications/unread
// @desc    Get unread notifications
// @access  Private
router.get('/unread', [
  protect,
], notificationController.getUnreadNotifications);

// @route   GET /api/notifications/archived
// @desc    Get archived notifications
// @access  Private
router.get('/archived', [
  protect,
], notificationController.getArchivedNotifications);

// @route   GET /api/notifications/by-type
// @desc    Get notifications by type
// @access  Private
router.get('/by-type', [
  protect,
  sanitizeInput,
  body('type')
    .isIn(['donation', 'expense', 'member', 'volunteer', 'campaign', 'event', 'general', 'urgent'])
    .withMessage('Invalid notification type specified'),
  handleValidationErrors,
], notificationController.getNotificationsByType);

// @route   GET /api/notifications/by-priority
// @desc    Get notifications by priority
// @access  Private
router.get('/by-priority', [
  protect,
  sanitizeInput,
  body('priority')
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority specified'),
  handleValidationErrors,
], notificationController.getNotificationsByPriority);

// @route   GET /api/notifications/recent
// @desc    Get recent notifications
// @access  Private
router.get('/recent', [
  protect,
  sanitizeInput,
  body('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
], notificationController.getRecentNotifications);

// @route   POST /api/notifications/schedule
// @desc    Schedule a notification
// @access  Private (Church Admin)
router.post('/schedule', [
  protect,
  sanitizeInput,
  body('churchId')
    .isMongoId()
    .withMessage('Valid church ID is required'),
  body('type')
    .isIn(['donation', 'expense', 'member', 'volunteer', 'campaign', 'event', 'general', 'urgent'])
    .withMessage('Invalid notification type specified'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Notification title must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Notification message must be between 10 and 1000 characters'),
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('At least one recipient is required'),
  body('recipients.*')
    .isIn(['all', 'members', 'volunteers', 'admins', 'specific'])
    .withMessage('Invalid recipient type specified'),
  body('channels')
    .isArray({ min: 1 })
    .withMessage('At least one channel is required'),
  body('channels.*')
    .isIn(['email', 'push', 'sms', 'in-app'])
    .withMessage('Invalid channel specified'),
  body('scheduledAt')
    .isISO8601()
    .withMessage('Valid scheduled date is required'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority specified'),
  handleValidationErrors,
], notificationController.scheduleNotification);

// @route   PUT /api/notifications/schedule/:id
// @desc    Update scheduled notification
// @access  Private (Church Admin)
router.put('/schedule/:id', [
  protect,
  validateObjectId('id'),
  sanitizeInput,
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Notification title must be between 5 and 200 characters'),
  body('message')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Notification message must be between 10 and 1000 characters'),
  body('scheduledAt')
    .optional()
    .isISO8601()
    .withMessage('Valid scheduled date is required'),
  body('priority')
    .optional()
    .isIn(['low', 'normal', 'high', 'urgent'])
    .withMessage('Invalid priority specified'),
  handleValidationErrors,
], notificationController.updateScheduledNotification);

// @route   DELETE /api/notifications/schedule/:id
// @desc    Cancel scheduled notification
// @access  Private (Church Admin)
router.delete('/schedule/:id', [
  protect,
  validateObjectId('id'),
], notificationController.cancelScheduledNotification);

// @route   GET /api/notifications/scheduled
// @desc    Get scheduled notifications
// @access  Private (Church Admin)
router.get('/scheduled', [
  protect,
], notificationController.getScheduledNotifications);

// @route   POST /api/notifications/templates
// @desc    Create notification template
// @access  Private (Church Admin)
router.post('/templates', [
  protect,
  sanitizeInput,
  body('name')
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Template name must be between 3 and 100 characters'),
  body('type')
    .isIn(['donation', 'expense', 'member', 'volunteer', 'campaign', 'event', 'general', 'urgent'])
    .withMessage('Invalid notification type specified'),
  body('title')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Template title must be between 5 and 200 characters'),
  body('message')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Template message must be between 10 and 1000 characters'),
  body('variables')
    .optional()
    .isArray()
    .withMessage('Variables must be an array'),
  body('variables.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each variable cannot exceed 50 characters'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors,
], notificationController.createTemplate);

// @route   GET /api/notifications/templates
// @desc    Get notification templates
// @access  Private (Church Admin)
router.get('/templates', [
  protect,
], notificationController.getTemplates);

// @route   GET /api/notifications/templates/:id
// @desc    Get notification template by ID
// @access  Private (Church Admin)
router.get('/templates/:id', [
  protect,
  validateObjectId('id'),
], notificationController.getTemplateById);

// @route   PUT /api/notifications/templates/:id
// @desc    Update notification template
// @access  Private (Church Admin)
router.put('/templates/:id', [
  protect,
  validateObjectId('id'),
  sanitizeInput,
  body('name')
    .optional()
    .trim()
    .isLength({ min: 3, max: 100 })
    .withMessage('Template name must be between 3 and 100 characters'),
  body('title')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Template title must be between 5 and 200 characters'),
  body('message')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Template message must be between 10 and 1000 characters'),
  body('variables')
    .optional()
    .isArray()
    .withMessage('Variables must be an array'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  handleValidationErrors,
], notificationController.updateTemplate);

// @route   DELETE /api/notifications/templates/:id
// @desc    Delete notification template
// @access  Private (Church Admin)
router.delete('/templates/:id', [
  protect,
  validateObjectId('id'),
], notificationController.deleteTemplate);

// @route   POST /api/notifications/send-template
// @desc    Send notification using template
// @access  Private (Church Admin)
router.post('/send-template', [
  protect,
  sanitizeInput,
  body('templateId')
    .isMongoId()
    .withMessage('Valid template ID is required'),
  body('churchId')
    .isMongoId()
    .withMessage('Valid church ID is required'),
  body('recipients')
    .isArray({ min: 1 })
    .withMessage('At least one recipient is required'),
  body('recipients.*')
    .isIn(['all', 'members', 'volunteers', 'admins', 'specific'])
    .withMessage('Invalid recipient type specified'),
  body('channels')
    .isArray({ min: 1 })
    .withMessage('At least one channel is required'),
  body('channels.*')
    .isIn(['email', 'push', 'sms', 'in-app'])
    .withMessage('Invalid channel specified'),
  body('variables')
    .optional()
    .isObject()
    .withMessage('Variables must be an object'),
  handleValidationErrors,
], notificationController.sendTemplateNotification);

// @route   GET /api/notifications/stats/church/:churchId
// @desc    Get notification statistics for a church
// @access  Private (Church Members)
router.get('/stats/church/:churchId', [
  protect,
  checkChurchAccess,
], notificationController.getNotificationStats);

// @route   GET /api/notifications/export/church/:churchId
// @desc    Export notifications to CSV/Excel
// @access  Private (Church Members)
router.get('/export/church/:churchId', [
  protect,
  checkChurchAccess,
], notificationController.exportNotifications);

module.exports = router;
