const mongoose = require("mongoose");

const userSubscriptionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User ID is required"],
    },
    subscriptionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Subscription",
      required: [true, "Subscription ID is required"],
    },
    subscriptionName: {
      type: String,
      required: [true, "Subscription name is required"],
      enum: ["free", "starter", "organisation"],
    },
    status: {
      type: String,
      enum: ["active", "expired", "cancelled", "suspended"],
      default: "active",
    },
    billingCycle: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    currentPeriod: {
      start: {
        type: Date,
        required: [true, "Period start date is required"],
      },
      end: {
        type: Date,
        required: [true, "Period end date is required"],
      },
    },
    nextBillingDate: {
      type: Date,
      required: [true, "Next billing date is required"],
    },
    autoRenew: {
      type: Boolean,
      default: true,
    },
    paymentMethod: {
      type: String,
      enum: ["card", "bank-transfer", "monnify", "other"],
      default: "monnify",
    },
    paymentDetails: {
      transactionReference: {
        type: String,
        trim: true,
      },
      amount: {
        type: Number,
        min: [0, "Amount cannot be negative"],
      },
      currency: {
        type: String,
        default: "NGN",
      },
      gateway: {
        type: String,
        trim: true,
      },
      gatewayResponse: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    usage: {
      churches: {
        current: {
          type: Number,
          default: 0,
          min: [0, "Current count cannot be negative"],
        },
        limit: {
          type: Number,
          required: [true, "Church limit is required"],
        },
      },
      donationCampaigns: {
        current: {
          type: Number,
          default: 0,
          min: [0, "Current count cannot be negative"],
        },
        limit: {
          type: Number,
          required: [true, "Donation campaign limit is required"],
        },
      },
      adminStaff: {
        current: {
          type: Number,
          default: 0,
          min: [0, "Current count cannot be negative"],
        },
        limit: {
          type: Number,
          required: [true, "Admin staff limit is required"],
        },
      },
      volunteers: {
        current: {
          type: Number,
          default: 0,
          min: [0, "Current count cannot be negative"],
        },
        limit: {
          type: Number,
          required: [true, "Volunteer limit is required"],
        },
      },
      volunteerTeams: {
        current: {
          type: Number,
          default: 0,
          min: [0, "Current count cannot be negative"],
        },
        limit: {
          type: Number,
          required: [true, "Volunteer team limit is required"],
        },
      },
    },
    billingHistory: [
      {
        period: {
          start: Date,
          end: Date,
        },
        amount: Number,
        currency: String,
        status: {
          type: String,
          enum: ["paid", "pending", "failed", "refunded"],
        },
        transactionReference: String,
        paidAt: Date,
        gateway: String,
      },
    ],
    cancellation: {
      requestedAt: Date,
      effectiveAt: Date,
      reason: {
        type: String,
        trim: true,
        maxlength: [500, "Cancellation reason cannot exceed 500 characters"],
      },
      requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes for performance
userSubscriptionSchema.index({ userId: 1, status: 1 });
userSubscriptionSchema.index({ status: 1, nextBillingDate: 1 });
userSubscriptionSchema.index({ subscriptionName: 1, status: 1 });

// Virtual for subscription status
userSubscriptionSchema.virtual("isActive").get(function () {
  return this.status === "active" && new Date() <= this.currentPeriod.end;
});

// Virtual for days until renewal
userSubscriptionSchema.virtual("daysUntilRenewal").get(function () {
  if (!this.isActive) return 0;
  const now = new Date();
  const renewal = new Date(this.nextBillingDate);
  const diffTime = renewal - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
});

// Virtual for usage percentage
userSubscriptionSchema.virtual("usagePercentage").get(function () {
  const percentages = {};

  Object.keys(this.usage).forEach((key) => {
    const { current, limit } = this.usage[key];
    if (limit === 0) {
      percentages[key] = 0; // Unlimited
    } else {
      percentages[key] = Math.round((current / limit) * 100);
    }
  });

  return percentages;
});

// Pre-save middleware to update usage limits from subscription
userSubscriptionSchema.pre("save", async function (next) {
  if (this.isModified("subscriptionId") || this.isNew) {
    try {
      const Subscription = mongoose.model("Subscription");
      const subscription = await Subscription.findById(this.subscriptionId);

      if (subscription) {
        this.usage.churches.limit = subscription.limits.churches;
        this.usage.donationCampaigns.limit =
          subscription.limits.donationCampaigns;
        this.usage.adminStaff.limit = subscription.limits.adminStaff;
        this.usage.volunteers.limit = subscription.limits.volunteers;
        this.usage.volunteerTeams.limit = subscription.limits.volunteerTeams;
      }
    } catch (error) {
      console.error("Error updating usage limits:", error);
    }
  }
  next();
});

// Instance method to check if user can perform an action
userSubscriptionSchema.methods.canPerformAction = function (action) {
  if (!this.isActive) return false;

  const usage = this.usage[action];
  if (!usage) return false;

  // Unlimited (0 means unlimited)
  if (usage.limit === 0) return true;

  // Check if current usage is within limit
  return usage.current < usage.limit;
};

// Instance method to increment usage
userSubscriptionSchema.methods.incrementUsage = function (action, amount = 1) {
  if (this.usage[action]) {
    this.usage[action].current += amount;
  }
  return this.save();
};

// Instance method to decrement usage
userSubscriptionSchema.methods.decrementUsage = function (action, amount = 1) {
  if (this.usage[action]) {
    this.usage[action].current = Math.max(
      0,
      this.usage[action].current - amount
    );
  }
  return this.save();
};

// Instance method to get remaining capacity
userSubscriptionSchema.methods.getRemainingCapacity = function (action) {
  const usage = this.usage[action];
  if (!usage) return 0;

  // Unlimited
  if (usage.limit === 0) return "unlimited";

  // Calculate remaining
  const remaining = usage.limit - usage.current;
  return Math.max(0, remaining);
};

// Instance method to check if usage is near limit
userSubscriptionSchema.methods.isNearLimit = function (
  action,
  threshold = 0.8
) {
  const usage = this.usage[action];
  if (!usage || usage.limit === 0) return false;

  const percentage = usage.current / usage.limit;
  return percentage >= threshold;
};

// Instance method to renew subscription
userSubscriptionSchema.methods.renew = function (periodDays = 30) {
  const now = new Date();
  const endDate = new Date(now.getTime() + periodDays * 24 * 60 * 60 * 1000);

  this.currentPeriod = {
    start: now,
    end: endDate,
  };

  this.nextBillingDate = endDate;
  this.status = "active";

  return this.save();
};

// Instance method to cancel subscription
userSubscriptionSchema.methods.cancel = function (reason, effectiveAt = null) {
  this.cancellation = {
    requestedAt: new Date(),
    effectiveAt: effectiveAt || this.currentPeriod.end,
    reason,
    requestedBy: this.userId,
  };

  this.autoRenew = false;

  return this.save();
};

// Static method to find active subscriptions
userSubscriptionSchema.statics.findActive = function () {
  return this.find({
    status: "active",
    "currentPeriod.end": { $gte: new Date() },
  });
};

// Static method to find subscriptions expiring soon
userSubscriptionSchema.statics.findExpiringSoon = function (days = 7) {
  const threshold = new Date();
  threshold.setDate(threshold.getDate() + days);

  return this.find({
    status: "active",
    "currentPeriod.end": { $lte: threshold, $gte: new Date() },
  });
};

// Static method to get user's current subscription
userSubscriptionSchema.statics.getCurrentSubscription = function (userId) {
  return this.findOne({
    userId,
    status: "active",
    "currentPeriod.end": { $gte: new Date() },
  }).populate("subscriptionId");
};

module.exports = mongoose.model("UserSubscription", userSubscriptionSchema);
