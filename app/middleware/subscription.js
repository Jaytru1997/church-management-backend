const SubscriptionService = require("../../config/subscriptionService");

/**
 * Middleware to check if user can create a church
 */
const canCreateChurch = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await SubscriptionService.canCreateChurch(userId);

    if (!result.canPerform) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Church creation not allowed with current subscription",
          reason: result.reason,
          action: "upgrade_subscription",
          currentPlan: "free",
          requiredPlan: "starter",
        },
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error checking subscription permissions" },
    });
  }
};

/**
 * Middleware to check if user can create a donation campaign
 */
const canCreateCampaign = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await SubscriptionService.canCreateCampaign(userId);

    if (!result.canPerform) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Campaign creation not allowed with current subscription",
          reason: result.reason,
          action: "upgrade_subscription",
          currentPlan: req.user.subscription?.name || "free",
          requiredPlan: "starter",
        },
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error checking subscription permissions" },
    });
  }
};

/**
 * Middleware to check if user can add admin staff
 */
const canAddAdminStaff = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await SubscriptionService.canAddAdminStaff(userId);

    if (!result.canPerform) {
      return res.status(403).json({
        success: false,
        error: {
          message: "Cannot add more admin staff with current subscription",
          reason: result.reason,
          action: "upgrade_subscription",
          currentPlan: req.user.subscription?.name || "free",
          requiredPlan: "starter",
        },
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error checking subscription permissions" },
    });
  }
};

/**
 * Middleware to check if user can create volunteer teams
 */
const canCreateVolunteerTeams = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const result = await SubscriptionService.canCreateVolunteerTeams(userId);

    if (!result.canPerform) {
      return res.status(403).json({
        success: false,
        error: {
          message:
            "Cannot create more volunteer teams with current subscription",
          reason: result.reason,
          action: "upgrade_subscription",
          currentPlan: req.user.subscription?.name || "free",
          requiredPlan: "starter",
        },
      });
    }

    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error checking subscription permissions" },
    });
  }
};

/**
 * Middleware to check if user can perform a specific action
 */
const canPerformAction = (action) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const result = await SubscriptionService.canPerformAction(userId, action);

      if (!result.canPerform) {
        return res.status(403).json({
          success: false,
          error: {
            message: `Action not allowed with current subscription: ${action}`,
            reason: result.reason,
            action: "upgrade_subscription",
          },
        });
      }

      next();
    } catch (error) {
      console.error("Subscription check error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error checking subscription permissions" },
      });
    }
  };
};

/**
 * Middleware to check if user has active subscription
 */
const hasActiveSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { userSubscription, isFree } =
      await SubscriptionService.getUserSubscription(userId);

    if (isFree) {
      return res.status(403).json({
        success: false,
        error: {
          message: "This action requires a paid subscription",
          action: "upgrade_subscription",
          availablePlans: ["starter", "organisation"],
        },
      });
    }

    if (!userSubscription || userSubscription.status !== "active") {
      return res.status(403).json({
        success: false,
        error: {
          message: "Active subscription required",
          action: "renew_subscription",
        },
      });
    }

    // Add subscription info to request for later use
    req.userSubscription = userSubscription;
    next();
  } catch (error) {
    console.error("Subscription check error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Error checking subscription status" },
    });
  }
};

/**
 * Middleware to check if user has minimum subscription level
 */
const hasMinimumSubscription = (minimumPlan) => {
  return async (req, res, next) => {
    try {
      const userId = req.user.id;
      const { userSubscription, isFree } =
        await SubscriptionService.getUserSubscription(userId);

      if (isFree) {
        return res.status(403).json({
          success: false,
          error: {
            message: `This action requires at least ${minimumPlan} subscription`,
            action: "upgrade_subscription",
            requiredPlan: minimumPlan,
          },
        });
      }

      if (!userSubscription) {
        return res.status(403).json({
          success: false,
          error: {
            message: "Active subscription required",
            action: "subscribe",
          },
        });
      }

      // Check subscription level
      const planHierarchy = { free: 0, starter: 1, organisation: 2 };
      const userPlanLevel =
        planHierarchy[userSubscription.subscriptionName] || 0;
      const requiredPlanLevel = planHierarchy[minimumPlan] || 0;

      if (userPlanLevel < requiredPlanLevel) {
        return res.status(403).json({
          success: false,
          error: {
            message: `This action requires ${minimumPlan} subscription or higher`,
            action: "upgrade_subscription",
            currentPlan: userSubscription.subscriptionName,
            requiredPlan: minimumPlan,
          },
        });
      }

      next();
    } catch (error) {
      console.error("Subscription check error:", error);
      res.status(500).json({
        success: false,
        error: { message: "Error checking subscription level" },
      });
    }
  };
};

/**
 * Middleware to add subscription info to request
 */
const addSubscriptionInfo = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const subscriptionInfo =
      await SubscriptionService.getUserSubscription(userId);

    req.subscriptionInfo = subscriptionInfo;
    next();
  } catch (error) {
    console.error("Error adding subscription info:", error);
    // Continue without subscription info
    req.subscriptionInfo = { isFree: true };
    next();
  }
};

module.exports = {
  canCreateChurch,
  canCreateCampaign,
  canAddAdminStaff,
  canCreateVolunteerTeams,
  canPerformAction,
  hasActiveSubscription,
  hasMinimumSubscription,
  addSubscriptionInfo,
};
