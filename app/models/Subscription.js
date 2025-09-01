const mongoose = require("mongoose");

const subscriptionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Subscription name is required"],
      enum: ["free", "starter", "organisation"],
      unique: true,
    },
    displayName: {
      type: String,
      required: [true, "Display name is required"],
      trim: true,
    },
    price: {
      amount: {
        type: Number,
        required: [true, "Price amount is required"],
        min: [0, "Price cannot be negative"],
      },
      currency: {
        type: String,
        default: "USD",
        enum: ["NGN", "USD", "EUR", "GBP"],
      },
      billingCycle: {
        type: String,
        default: "monthly",
        enum: ["monthly", "yearly"],
      },
    },
    limits: {
      churches: {
        type: Number,
        required: [true, "Church limit is required"],
        // min: [0, "Church limit cannot be negative"],
      },
      donationCampaigns: {
        type: Number,
        required: [true, "Donation campaign limit is required"],
        // min: [0, "Donation campaign limit cannot be negative"],
      },
      adminStaff: {
        type: Number,
        required: [true, "Admin staff limit is required"],
        // min: [0, "Admin staff limit cannot be negative"],
      },
      volunteers: {
        type: Number,
        required: [true, "Volunteer limit is required"],
        // min: [0, "Volunteer limit cannot be negative"],
      },
      volunteerTeams: {
        type: Number,
        required: [true, "Volunteer team limit is required"],
        // min: [0, "Volunteer team limit cannot be negative"],
      },
    },
    features: [
      {
        name: {
          type: String,
          required: true,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
        isEnabled: {
          type: Boolean,
          default: true,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
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

// Virtual for formatted price
subscriptionSchema.virtual("formattedPrice").get(function () {
  return `${this.price.currency} ${this.price.amount.toLocaleString()}`;
});

// Virtual for monthly price (if yearly billing)
subscriptionSchema.virtual("monthlyPrice").get(function () {
  if (this.price.billingCycle === "yearly") {
    return this.price.amount / 12;
  }
  return this.price.amount;
});

// Static method to get subscription by name
subscriptionSchema.statics.findByName = function (name) {
  return this.findOne({ name, isActive: true });
};

// Static method to get all active subscriptions
subscriptionSchema.statics.getActiveSubscriptions = function () {
  return this.find({ isActive: true }).sort({ "price.amount": 1 });
};

// Instance method to check if a feature is available
subscriptionSchema.methods.hasFeature = function (featureName) {
  const feature = this.features.find((f) => f.name === featureName);
  return feature ? feature.isEnabled : false;
};

// Instance method to check if a limit allows an action
subscriptionSchema.methods.canPerformAction = function (
  action,
  currentCount = 0
) {
  const limits = {
    churches: this.limits.churches,
    donationCampaigns: this.limits.donationCampaigns,
    adminStaff: this.limits.adminStaff,
    volunteers: this.limits.volunteers,
    volunteerTeams: this.limits.volunteerTeams,
  };

  const limit = limits[action];

  // Unlimited (-1 means unlimited)
  if (limit === -1) return true;

  // Check if current count is within limit
  return currentCount < limit;
};

// Instance method to get remaining capacity
subscriptionSchema.methods.getRemainingCapacity = function (
  action,
  currentCount = 0
) {
  const limits = {
    churches: this.limits.churches,
    donationCampaigns: this.limits.donationCampaigns,
    adminStaff: this.limits.adminStaff,
    volunteers: this.limits.volunteers,
    volunteerTeams: this.limits.volunteerTeams,
  };

  const limit = limits[action];

  // Unlimited
  if (limit === -1) return "unlimited";

  // Calculate remaining
  const remaining = limit - currentCount;
  return Math.max(0, remaining);
};

module.exports = mongoose.model("Subscription", subscriptionSchema);
