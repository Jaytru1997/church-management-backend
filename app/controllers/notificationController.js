const {
  sendNotification,
  sendChurchNotification,
  sendUserNotification,
  sendTeamNotification,
} = require("../../config/pusher");
const emailService = require("../../config/email");

// @desc    Send a notification
// @route   POST /api/notifications/send
// @access  Private (Church Admin)
const sendNotificationHandler = async (req, res) => {
  try {
    const { churchId, type, title, message, priority, recipients, data } =
      req.body;

    // Send real-time notification
    const notificationData = {
      type,
      title,
      message,
      priority: priority || "normal",
      data,
      sentAt: new Date(),
      sentBy: req.user.id,
    };

    // Send to specific recipients if provided
    if (recipients && recipients.length > 0) {
      recipients.forEach((recipientId) => {
        sendUserNotification(
          recipientId,
          "notification-received",
          notificationData
        );
      });
    }

    // Send to church channel if churchId provided
    if (churchId) {
      sendChurchNotification(churchId, "notification-sent", notificationData);
    }

    res.json({
      success: true,
      data: { notification: notificationData },
      message: "Notification sent successfully",
    });
  } catch (error) {
    console.error("Send notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to send notification" },
    });
  }
};

// @desc    Send notification to church members
// @route   POST /api/notifications/send-church
// @access  Private (Church Admin)
const sendChurchNotificationHandler = async (req, res) => {
  try {
    const {
      type,
      title,
      message,
      priority,
      data,
      includeMembers,
      includeVolunteers,
    } = req.body;
    const churchId = req.churchAccess.churchId;

    const notificationData = {
      type,
      title,
      message,
      priority: priority || "normal",
      data,
      sentAt: new Date(),
      sentBy: req.user.id,
      churchId,
    };

    // Send to church channel
    sendChurchNotification(churchId, "church-notification", notificationData);

    // Send email notifications if configured
    if (data?.sendEmail) {
      try {
        // This would typically involve getting church member emails and sending bulk emails
        // For now, we'll just log the intent
        console.log("Email notification requested for church:", churchId);
      } catch (emailError) {
        console.error("Email notification error:", emailError);
      }
    }

    res.json({
      success: true,
      data: { notification: notificationData },
      message: "Church notification sent successfully",
    });
  } catch (error) {
    console.error("Send church notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to send church notification" },
    });
  }
};

// @desc    Send notification to specific user
// @route   POST /api/notifications/send-user
// @access  Private (Church Admin)
const sendUserNotificationHandler = async (req, res) => {
  try {
    const { userId, type, title, message, priority, data } = req.body;

    const notificationData = {
      type,
      title,
      message,
      priority: priority || "normal",
      data,
      sentAt: new Date(),
      sentBy: req.user.id,
    };

    // Send real-time notification
    sendUserNotification(userId, "notification-received", notificationData);

    // Send email notification if configured
    if (data?.sendEmail) {
      try {
        // This would typically involve getting user email and sending email
        console.log("Email notification requested for user:", userId);
      } catch (emailError) {
        console.error("Email notification error:", emailError);
      }
    }

    res.json({
      success: true,
      data: { notification: notificationData },
      message: "User notification sent successfully",
    });
  } catch (error) {
    console.error("Send user notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to send user notification" },
    });
  }
};

// @desc    Send notification to team members
// @route   POST /api/notifications/send-team
// @access  Private (Church Admin)
const sendTeamNotificationHandler = async (req, res) => {
  try {
    const { teamId, type, title, message, priority, data } = req.body;

    const notificationData = {
      type,
      title,
      message,
      priority: priority || "normal",
      data,
      sentAt: new Date(),
      sentBy: req.user.id,
      teamId,
    };

    // Send to team channel
    sendTeamNotification(teamId, "team-notification", notificationData);

    res.json({
      success: true,
      data: { notification: notificationData },
      message: "Team notification sent successfully",
    });
  } catch (error) {
    console.error("Send team notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to send team notification" },
    });
  }
};

// @desc    Get all notifications for current user
// @route   GET /api/notifications
// @access  Private
const getAllNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { type, priority, isRead, isArchived } = req.query;
    const filter = { userId: req.user.id };

    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (isRead !== undefined) filter.isRead = isRead === "true";
    if (isArchived !== undefined) filter.isArchived = isArchived === "true";

    // In a real implementation, you would have a Notification model
    // For now, we'll return a mock response
    const notifications = [];
    const total = 0;

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all notifications error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get notifications" },
    });
  }
};

// @desc    Get notifications by church
// @route   GET /api/notifications/church/:churchId
// @access  Private (Church Members)
const getNotificationsByChurch = async (req, res) => {
  try {
    const { churchId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { type, priority, startDate, endDate } = req.query;
    const filter = { churchId };

    if (type) filter.type = type;
    if (priority) filter.priority = priority;
    if (startDate || endDate) {
      filter.sentAt = {};
      if (startDate) filter.sentAt.$gte = new Date(startDate);
      if (endDate) filter.sentAt.$lte = new Date(endDate);
    }

    // In a real implementation, you would query the Notification model
    // For now, we'll return a mock response
    const notifications = [];
    const total = 0;

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get notifications by church error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get church notifications" },
    });
  }
};

// @desc    Get notification by ID
// @route   GET /api/notifications/:id
// @access  Private
const getNotificationById = async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would query the Notification model
    // For now, we'll return a mock response
    const notification = null;

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { message: "Notification not found" },
      });
    }

    res.json({
      success: true,
      data: { notification },
    });
  } catch (error) {
    console.error("Get notification by ID error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get notification" },
    });
  }
};

// @desc    Mark notification as read
// @route   PUT /api/notifications/:id/read
// @access  Private
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would update the Notification model
    // For now, we'll return a mock response
    console.log("Marking notification as read:", id);

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Mark notification as read error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to mark notification as read" },
    });
  }
};

// @desc    Mark notification as unread
// @route   PUT /api/notifications/:id/unread
// @access  Private
const markNotificationAsUnread = async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would update the Notification model
    // For now, we'll return a mock response
    console.log("Marking notification as unread:", id);

    res.json({
      success: true,
      message: "Notification marked as unread",
    });
  } catch (error) {
    console.error("Mark notification as unread error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to mark notification as unread" },
    });
  }
};

// @desc    Archive notification
// @route   PUT /api/notifications/:id/archive
// @access  Private
const archiveNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would update the Notification model
    // For now, we'll return a mock response
    console.log("Archiving notification:", id);

    res.json({
      success: true,
      message: "Notification archived successfully",
    });
  } catch (error) {
    console.error("Archive notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to archive notification" },
    });
  }
};

// @desc    Unarchive notification
// @route   PUT /api/notifications/:id/unarchive
// @access  Private
const unarchiveNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would update the Notification model
    // For now, we'll return a mock response
    console.log("Unarchiving notification:", id);

    res.json({
      success: true,
      message: "Notification unarchived successfully",
    });
  } catch (error) {
    console.error("Unarchive notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to unarchive notification" },
    });
  }
};

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would delete from the Notification model
    // For now, we'll return a mock response
    console.log("Deleting notification:", id);

    res.json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to delete notification" },
    });
  }
};

// @desc    Bulk mark notifications as read
// @route   PUT /api/notifications/bulk/read
// @access  Private
const bulkMarkAsRead = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        error: { message: "Notification IDs array is required" },
      });
    }

    // In a real implementation, you would update multiple notifications
    // For now, we'll return a mock response
    console.log("Bulk marking notifications as read:", notificationIds);

    res.json({
      success: true,
      message: `${notificationIds.length} notifications marked as read`,
    });
  } catch (error) {
    console.error("Bulk mark as read error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to bulk mark notifications as read" },
    });
  }
};

// @desc    Bulk archive notifications
// @route   PUT /api/notifications/bulk/archive
// @access  Private
const bulkArchive = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        error: { message: "Notification IDs array is required" },
      });
    }

    // In a real implementation, you would update multiple notifications
    // For now, we'll return a mock response
    console.log("Bulk archiving notifications:", notificationIds);

    res.json({
      success: true,
      message: `${notificationIds.length} notifications archived successfully`,
    });
  } catch (error) {
    console.error("Bulk archive error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to bulk archive notifications" },
    });
  }
};

// @desc    Bulk delete notifications
// @route   PUT /api/notifications/bulk/delete
// @access  Private
const bulkDelete = async (req, res) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return res.status(400).json({
        success: false,
        error: { message: "Notification IDs array is required" },
      });
    }

    // In a real implementation, you would delete multiple notifications
    // For now, we'll return a mock response
    console.log("Bulk deleting notifications:", notificationIds);

    res.json({
      success: true,
      message: `${notificationIds.length} notifications deleted successfully`,
    });
  } catch (error) {
    console.error("Bulk delete error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to bulk delete notifications" },
    });
  }
};

// @desc    Get unread notification count
// @route   GET /api/notifications/unread/count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    // In a real implementation, you would count unread notifications
    // For now, we'll return a mock response
    const count = 0;

    res.json({
      success: true,
      data: { count },
    });
  } catch (error) {
    console.error("Get unread count error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get unread count" },
    });
  }
};

// @desc    Get unread notifications
// @route   GET /api/notifications/unread
// @access  Private
const getUnreadNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // In a real implementation, you would query unread notifications
    // For now, we'll return a mock response
    const notifications = [];
    const total = 0;

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get unread notifications error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get unread notifications" },
    });
  }
};

// @desc    Get archived notifications
// @route   GET /api/notifications/archived
// @access  Private
const getArchivedNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // In a real implementation, you would query archived notifications
    // For now, we'll return a mock response
    const notifications = [];
    const total = 0;

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get archived notifications error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get archived notifications" },
    });
  }
};

// @desc    Get notifications by type
// @route   GET /api/notifications/type/:type
// @access  Private
const getNotificationsByType = async (req, res) => {
  try {
    const { type } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // In a real implementation, you would query notifications by type
    // For now, we'll return a mock response
    const notifications = [];
    const total = 0;

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get notifications by type error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get notifications by type" },
    });
  }
};

// @desc    Get notifications by priority
// @route   GET /api/notifications/priority/:priority
// @access  Private
const getNotificationsByPriority = async (req, res) => {
  try {
    const { priority } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // In a real implementation, you would query notifications by priority
    // For now, we'll return a mock response
    const notifications = [];
    const total = 0;

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get notifications by priority error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get notifications by priority" },
    });
  }
};

// @desc    Get recent notifications
// @route   GET /api/notifications/recent
// @access  Private
const getRecentNotifications = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    // In a real implementation, you would query recent notifications
    // For now, we'll return a mock response
    const notifications = [];

    res.json({
      success: true,
      data: { notifications },
    });
  } catch (error) {
    console.error("Get recent notifications error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get recent notifications" },
    });
  }
};

// @desc    Schedule notification
// @route   POST /api/notifications/schedule
// @access  Private (Church Admin)
const scheduleNotification = async (req, res) => {
  try {
    const {
      churchId,
      type,
      title,
      message,
      priority,
      recipients,
      scheduledAt,
      data,
    } = req.body;

    // In a real implementation, you would create a scheduled notification
    // For now, we'll return a mock response
    const scheduledNotification = {
      id: "scheduled_" + Date.now(),
      type,
      title,
      message,
      priority: priority || "normal",
      recipients,
      scheduledAt: new Date(scheduledAt),
      data,
      createdBy: req.user.id,
    };

    res.status(201).json({
      success: true,
      data: { scheduledNotification },
      message: "Notification scheduled successfully",
    });
  } catch (error) {
    console.error("Schedule notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to schedule notification" },
    });
  }
};

// @desc    Update scheduled notification
// @route   PUT /api/notifications/schedule/:id
// @access  Private (Church Admin)
const updateScheduledNotification = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, message, priority, scheduledAt, recipients } = req.body;

    // In a real implementation, you would update the scheduled notification
    // For now, we'll return a mock response
    console.log("Updating scheduled notification:", id);

    res.json({
      success: true,
      message: "Scheduled notification updated successfully",
    });
  } catch (error) {
    console.error("Update scheduled notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to update scheduled notification" },
    });
  }
};

// @desc    Cancel scheduled notification
// @route   DELETE /api/notifications/schedule/:id
// @access  Private (Church Admin)
const cancelScheduledNotification = async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would cancel the scheduled notification
    // For now, we'll return a mock response
    console.log("Canceling scheduled notification:", id);

    res.json({
      success: true,
      message: "Scheduled notification canceled successfully",
    });
  } catch (error) {
    console.error("Cancel scheduled notification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to cancel scheduled notification" },
    });
  }
};

// @desc    Get scheduled notifications
// @route   GET /api/notifications/schedule
// @access  Private (Church Admin)
const getScheduledNotifications = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // In a real implementation, you would query scheduled notifications
    // For now, we'll return a mock response
    const scheduledNotifications = [];
    const total = 0;

    res.json({
      success: true,
      data: {
        scheduledNotifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get scheduled notifications error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get scheduled notifications" },
    });
  }
};

// @desc    Create notification template
// @route   POST /api/notifications/templates
// @access  Private (Church Admin)
const createNotificationTemplate = async (req, res) => {
  try {
    const { churchId, name, type, title, message, priority, data, isActive } =
      req.body;

    // In a real implementation, you would create a notification template
    // For now, we'll return a mock response
    const template = {
      id: "template_" + Date.now(),
      churchId,
      name,
      type,
      title,
      message,
      priority: priority || "normal",
      data,
      isActive: isActive !== false,
      createdBy: req.user.id,
      createdAt: new Date(),
    };

    res.status(201).json({
      success: true,
      data: { template },
      message: "Notification template created successfully",
    });
  } catch (error) {
    console.error("Create notification template error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to create notification template" },
    });
  }
};

// @desc    Get notification template by ID
// @route   GET /api/notifications/templates/:id
// @access  Private (Church Admin)
const getNotificationTemplateById = async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would fetch the template from database
    // For now, we'll return a mock response
    const template = {
      _id: id,
      name: "Sample Template",
      title: "Sample Title",
      message: "Sample message with variables: {{name}}, {{amount}}",
      type: "general",
      variables: ["name", "amount"],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    res.json({
      success: true,
      data: { template },
    });
  } catch (error) {
    console.error("Get notification template by ID error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get notification template" },
    });
  }
};

// @desc    Get notification templates
// @route   GET /api/notifications/templates
// @access  Private (Church Admin)
const getNotificationTemplates = async (req, res) => {
  try {
    const { churchId } = req.query;

    // In a real implementation, you would query notification templates
    // For now, we'll return a mock response
    const templates = [];

    res.json({
      success: true,
      data: { templates },
    });
  } catch (error) {
    console.error("Get notification templates error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get notification templates" },
    });
  }
};

// @desc    Update notification template
// @route   PUT /api/notifications/templates/:id
// @access  Private (Church Admin)
const updateNotificationTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, title, message, priority, data, isActive } = req.body;

    // In a real implementation, you would update the notification template
    // For now, we'll return a mock response
    console.log("Updating notification template:", id);

    res.json({
      success: true,
      message: "Notification template updated successfully",
    });
  } catch (error) {
    console.error("Update notification template error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to update notification template" },
    });
  }
};

// @desc    Delete notification template
// @route   DELETE /api/notifications/templates/:id
// @access  Private (Church Admin)
const deleteNotificationTemplate = async (req, res) => {
  try {
    const { id } = req.params;

    // In a real implementation, you would delete the notification template
    // For now, we'll return a mock response
    console.log("Deleting notification template:", id);

    res.json({
      success: true,
      message: "Notification template deleted successfully",
    });
  } catch (error) {
    console.error("Delete notification template error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to delete notification template" },
    });
  }
};

// @desc    Send notification using template
// @route   POST /api/notifications/templates/:id/send
// @access  Private (Church Admin)
const sendNotificationUsingTemplate = async (req, res) => {
  try {
    const { id } = req.params;
    const { recipients, customData } = req.body;

    // In a real implementation, you would send notification using the template
    // For now, we'll return a mock response
    console.log("Sending notification using template:", id);

    res.json({
      success: true,
      message: "Notification sent using template successfully",
    });
  } catch (error) {
    console.error("Send notification using template error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to send notification using template" },
    });
  }
};

// @desc    Get notification statistics
// @route   GET /api/notifications/stats
// @access  Private (Church Admin)
const getNotificationStats = async (req, res) => {
  try {
    const { churchId, startDate, endDate } = req.query;

    // In a real implementation, you would calculate notification statistics
    // For now, we'll return a mock response
    const stats = {
      totalSent: 0,
      totalRead: 0,
      totalUnread: 0,
      totalArchived: 0,
      byType: {},
      byPriority: {},
    };

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error("Get notification stats error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get notification statistics" },
    });
  }
};

// @desc    Export notifications
// @route   GET /api/notifications/export
// @access  Private (Church Admin)
const exportNotifications = async (req, res) => {
  try {
    const { churchId, format = "csv", startDate, endDate } = req.query;

    // In a real implementation, you would export notifications
    // For now, we'll return a mock response
    console.log("Exporting notifications:", {
      churchId,
      format,
      startDate,
      endDate,
    });

    res.json({
      success: true,
      message: "Notifications exported successfully",
      data: { downloadUrl: "/exports/notifications.csv" },
    });
  } catch (error) {
    console.error("Export notifications error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to export notifications" },
    });
  }
};

module.exports = {
  sendNotificationHandler,
  sendChurchNotificationHandler,
  sendUserNotificationHandler,
  sendTeamNotificationHandler,
  getAllNotifications,
  getNotificationsByChurch,
  getNotificationById,
  markNotificationAsRead,
  markNotificationAsUnread,
  archiveNotification,
  unarchiveNotification,
  deleteNotification,
  bulkMarkAsRead,
  bulkArchive,
  bulkDelete,
  getUnreadCount,
  getUnreadNotifications,
  getArchivedNotifications,
  getNotificationsByType,
  getNotificationsByPriority,
  getRecentNotifications,
  scheduleNotification,
  updateScheduledNotification,
  cancelScheduledNotification,
  getScheduledNotifications,
  createNotificationTemplate,
  getNotificationTemplates,
  getNotificationTemplateById,
  updateNotificationTemplate,
  deleteNotificationTemplate,
  sendNotificationUsingTemplate,
  getNotificationStats,
  exportNotifications,
};
