const Subscription = require("../models/Subscription");
const UserSubscription = require("../models/UserSubscription");
const SubscriptionService = require("../../config/subscriptionService");
const { sendUserNotification } = require("../../config/pusher");
const emailService = require("../../config/email");

// @desc    Get available subscription plans
// @route   GET /api/subscriptions/plans
// @access  Public
const getAvailablePlans = async (req, res) => {
  try {
    const plans = await SubscriptionService.getAvailablePlans();

    res.json({
      success: true,
      data: { plans },
    });
  } catch (error) {
    console.error("Get available plans error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get subscription plans" },
    });
  }
};

// @desc    Get user's current subscription
// @route   GET /api/subscriptions/current
// @access  Private
const getCurrentSubscription = async (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptionInfo =
      await SubscriptionService.getUserSubscription(userId);

    res.json({
      success: true,
      data: { subscription: subscriptionInfo },
    });
  } catch (error) {
    console.error("Get current subscription error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get current subscription" },
    });
  }
};

// @desc    Get user's subscription usage summary
// @route   GET /api/subscriptions/usage
// @access  Private
const getUsageSummary = async (req, res) => {
  try {
    const userId = req.user.id;
    const usageSummary = await SubscriptionService.getUserUsageSummary(userId);

    res.json({
      success: true,
      data: { usage: usageSummary },
    });
  } catch (error) {
    console.error("Get usage summary error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get usage summary" },
    });
  }
};

// @desc    Subscribe to a plan
// @route   POST /api/subscriptions/subscribe
// @access  Private
const subscribeToPlan = async (req, res) => {
  try {
    const { subscriptionName, billingCycle, paymentMethod } = req.body;
    const userId = req.user.id;

    // Validate subscription plan
    const subscription = await Subscription.findByName(subscriptionName);
    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid subscription plan" },
      });
    }

    // Check if user is already subscribed to this plan
    const currentSubscription =
      await UserSubscription.getCurrentSubscription(userId);
    if (
      currentSubscription &&
      currentSubscription.subscriptionName === subscriptionName
    ) {
      return res.status(400).json({
        success: false,
        error: { message: "Already subscribed to this plan" },
      });
    }

    // For paid plans, validate payment method
    if (subscription.price.amount > 0 && !paymentMethod) {
      return res.status(400).json({
        success: false,
        error: { message: "Payment method required for paid plans" },
      });
    }

    // Create user subscription
    const userSubscription = await SubscriptionService.createUserSubscription(
      userId,
      subscriptionName,
      billingCycle
    );

    // Send notification
    sendUserNotification(userId, "subscription-activated", {
      planName: subscription.displayName,
      planType: subscriptionName,
      billingCycle,
    });

    // Send welcome email for paid plans
    if (subscription.price.amount > 0) {
      try {
        await emailService.sendSubscriptionWelcome(
          req.user.email,
          req.user.firstName,
          subscription.displayName,
          subscription.price.amount,
          subscription.price.currency
        );
      } catch (emailError) {
        console.error("Subscription welcome email error:", emailError);
      }
    }

    res.status(201).json({
      success: true,
      data: { subscription: userSubscription },
      message: `Successfully subscribed to ${subscription.displayName}`,
    });
  } catch (error) {
    console.error("Subscribe to plan error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to subscribe to plan" },
    });
  }
};

// @desc    Upgrade subscription
// @route   PUT /api/subscriptions/upgrade
// @access  Private
const upgradeSubscription = async (req, res) => {
  try {
    const { subscriptionName, billingCycle, paymentMethod } = req.body;
    const userId = req.user.id;

    // Validate subscription change
    const validation = await SubscriptionService.validateSubscriptionChange(
      userId,
      subscriptionName
    );
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: { message: validation.reason },
      });
    }

    // Get current subscription info
    const currentSubscription =
      await UserSubscription.getCurrentSubscription(userId);
    const newSubscription = await Subscription.findByName(subscriptionName);

    // Create new subscription
    const userSubscription = await SubscriptionService.createUserSubscription(
      userId,
      subscriptionName,
      billingCycle
    );

    // Send notification
    sendUserNotification(userId, "subscription-upgraded", {
      fromPlan: currentSubscription?.subscriptionName || "free",
      toPlan: subscriptionName,
      planName: newSubscription.displayName,
    });

    res.json({
      success: true,
      data: { subscription: userSubscription },
      message: `Successfully upgraded to ${newSubscription.displayName}`,
    });
  } catch (error) {
    console.error("Upgrade subscription error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to upgrade subscription" },
    });
  }
};

// @desc    Cancel subscription
// @route   PUT /api/subscriptions/cancel
// @access  Private
const cancelSubscription = async (req, res) => {
  try {
    const { reason } = req.body;
    const userId = req.user.id;

    const userSubscription =
      await UserSubscription.getCurrentSubscription(userId);
    if (!userSubscription) {
      return res.status(404).json({
        success: false,
        error: { message: "No active subscription found" },
      });
    }

    // Cancel subscription
    await userSubscription.cancel(reason);

    // Send notification
    sendUserNotification(userId, "subscription-cancelled", {
      planName: userSubscription.subscriptionName,
      reason,
      effectiveDate: userSubscription.cancellation.effectiveAt,
    });

    res.json({
      success: true,
      message: "Subscription cancelled successfully",
      data: {
        effectiveDate: userSubscription.cancellation.effectiveAt,
        reason: userSubscription.cancellation.reason,
      },
    });
  } catch (error) {
    console.error("Cancel subscription error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to cancel subscription" },
    });
  }
};

// @desc    Renew subscription
// @route   PUT /api/subscriptions/renew
// @access  Private
const renewSubscription = async (req, res) => {
  try {
    const { billingCycle } = req.body;
    const userId = req.user.id;

    const userSubscription =
      await UserSubscription.getCurrentSubscription(userId);
    if (!userSubscription) {
      return res.status(404).json({
        success: false,
        error: { message: "No active subscription found" },
      });
    }

    // Renew subscription
    const periodDays = billingCycle === "yearly" ? 365 : 30;
    await userSubscription.renew(periodDays);

    // Send notification
    sendUserNotification(userId, "subscription-renewed", {
      planName: userSubscription.subscriptionName,
      billingCycle,
      nextBillingDate: userSubscription.nextBillingDate,
    });

    res.json({
      success: true,
      message: "Subscription renewed successfully",
      data: {
        nextBillingDate: userSubscription.nextBillingDate,
        billingCycle: userSubscription.billingCycle,
      },
    });
  } catch (error) {
    console.error("Renew subscription error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to renew subscription" },
    });
  }
};

// @desc    Get subscription billing history
// @route   GET /api/subscriptions/billing-history
// @access  Private
const getBillingHistory = async (req, res) => {
  try {
    const userId = req.user.id;
    const userSubscription =
      await UserSubscription.getCurrentSubscription(userId);

    if (!userSubscription) {
      return res.status(404).json({
        success: false,
        error: { message: "No subscription found" },
      });
    }

    const billingHistory = userSubscription.billingHistory || [];

    res.json({
      success: true,
      data: { billingHistory },
    });
  } catch (error) {
    console.error("Get billing history error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get billing history" },
    });
  }
};

// @desc    Process subscription payment
// @route   POST /api/subscriptions/process-payment
// @access  Private
const processPayment = async (req, res) => {
  try {
    const { subscriptionName, billingCycle, paymentMethod, paymentDetails } =
      req.body;
    const userId = req.user.id;

    // Validate subscription plan
    const subscription = await Subscription.findByName(subscriptionName);
    if (!subscription) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid subscription plan" },
      });
    }

    // For free plans, just create subscription
    if (subscription.price.amount === 0) {
      const userSubscription = await SubscriptionService.createUserSubscription(
        userId,
        subscriptionName,
        billingCycle
      );

      return res.status(201).json({
        success: true,
        data: { subscription: userSubscription },
        message: `Successfully subscribed to ${subscription.displayName}`,
      });
    }

    // For paid plans, process payment (this would integrate with Monnify)
    // For now, we'll simulate successful payment
    const userSubscription = await SubscriptionService.createUserSubscription(
      userId,
      subscriptionName,
      billingCycle
    );

    // Update payment details
    userSubscription.paymentMethod = paymentMethod;
    userSubscription.paymentDetails = {
      ...paymentDetails,
      amount: subscription.price.amount,
      currency: subscription.price.currency,
      gateway: "monnify",
    };

    // Add to billing history
    userSubscription.billingHistory.push({
      period: {
        start: userSubscription.currentPeriod.start,
        end: userSubscription.currentPeriod.end,
      },
      amount: subscription.price.amount,
      currency: subscription.price.currency,
      status: "paid",
      transactionReference: paymentDetails.transactionReference,
      paidAt: new Date(),
      gateway: "monnify",
    });

    await userSubscription.save();

    res.status(201).json({
      success: true,
      data: { subscription: userSubscription },
      message: `Successfully subscribed to ${subscription.displayName}`,
    });
  } catch (error) {
    console.error("Process payment error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to process payment" },
    });
  }
};

// @desc    Get subscription analytics
// @route   GET /api/subscriptions/analytics
// @access  Private (Admin)
const getSubscriptionAnalytics = async (req, res) => {
  try {
    // Get subscription statistics
    const totalSubscriptions = await UserSubscription.countDocuments();
    const activeSubscriptions = await UserSubscription.countDocuments({
      status: "active",
    });
    const expiredSubscriptions = await UserSubscription.countDocuments({
      status: "expired",
    });
    const cancelledSubscriptions = await UserSubscription.countDocuments({
      status: "cancelled",
    });

    // Get plan distribution
    const planDistribution = await UserSubscription.aggregate([
      { $match: { status: "active" } },
      {
        $group: {
          _id: "$subscriptionName",
          count: { $sum: 1 },
        },
      },
    ]);

    // Get revenue data (for paid plans)
    const revenueData = await UserSubscription.aggregate([
      { $match: { status: "active" } },
      {
        $lookup: {
          from: "subscriptions",
          localField: "subscriptionId",
          foreignField: "_id",
          as: "subscription",
        },
      },
      { $unwind: "$subscription" },
      {
        $group: {
          _id: "$subscriptionName",
          totalRevenue: { $sum: "$subscription.price.amount" },
          count: { $sum: 1 },
        },
      },
    ]);

    const analytics = {
      overview: {
        total: totalSubscriptions,
        active: activeSubscriptions,
        expired: expiredSubscriptions,
        cancelled: cancelledSubscriptions,
      },
      planDistribution,
      revenueData,
    };

    res.json({
      success: true,
      data: { analytics },
    });
  } catch (error) {
    console.error("Get subscription analytics error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get subscription analytics" },
    });
  }
};

module.exports = {
  getAvailablePlans,
  getCurrentSubscription,
  getUsageSummary,
  subscribeToPlan,
  upgradeSubscription,
  cancelSubscription,
  renewSubscription,
  getBillingHistory,
  processPayment,
  getSubscriptionAnalytics,
};
