const Subscription = require("../app/models/Subscription");
const UserSubscription = require("../app/models/UserSubscription");

class SubscriptionService {
  /**
   * Initialize default subscription plans
   */
  static async initializeDefaultSubscriptions() {
    try {
      const defaultSubscriptions = [
        {
          name: "free",
          displayName: "Free Plan",
          price: {
            amount: 0,
            currency: "NGN",
            billingCycle: "monthly",
          },
          limits: {
            churches: 0,
            donationCampaigns: 0,
            adminStaff: 0,
            volunteers: 0,
            volunteerTeams: 0,
          },
          features: [
            {
              name: "user_registration",
              description: "Can register on the app",
              isEnabled: true,
            },
            {
              name: "make_donations",
              description: "Can make donations to donation causes",
              isEnabled: true,
            },
            {
              name: "be_added_to_church",
              description:
                "Can be added as administrative member or volunteer to existing churches",
              isEnabled: true,
            },
          ],
          description: "Free tier for basic app usage and donations",
        },
        {
          name: "starter",
          displayName: "Starter Plan",
          price: {
            amount: 3000,
            currency: "NGN",
            billingCycle: "monthly",
          },
          limits: {
            churches: 1,
            donationCampaigns: 3,
            adminStaff: 3,
            volunteers: 0, // unlimited
            volunteerTeams: 0, // unlimited
          },
          features: [
            {
              name: "create_church",
              description: "Can create one church",
              isEnabled: true,
            },
            {
              name: "donation_campaigns",
              description: "Can create up to 3 donation campaigns",
              isEnabled: true,
            },
            {
              name: "admin_staff",
              description: "Can add up to 3 admin staff",
              isEnabled: true,
            },
            {
              name: "unlimited_volunteers",
              description: "Can add unlimited volunteers",
              isEnabled: true,
            },
            {
              name: "unlimited_volunteer_teams",
              description: "Can create unlimited volunteer teams",
              isEnabled: true,
            },
          ],
          description: "Perfect for small churches and ministries",
        },
        {
          name: "organisation",
          displayName: "Organisation Plan",
          price: {
            amount: 9000,
            currency: "NGN",
            billingCycle: "monthly",
          },
          limits: {
            churches: 0, // unlimited
            donationCampaigns: 0, // unlimited
            adminStaff: 0, // unlimited
            volunteers: 0, // unlimited
            volunteerTeams: 0, // unlimited
          },
          features: [
            {
              name: "unlimited_churches",
              description: "Can create unlimited churches",
              isEnabled: true,
            },
            {
              name: "unlimited_campaigns",
              description: "Can create unlimited donation campaigns",
              isEnabled: true,
            },
            {
              name: "unlimited_admin_staff",
              description: "Can add unlimited admin staff",
              isEnabled: true,
            },
            {
              name: "unlimited_volunteers",
              description: "Can add unlimited volunteers",
              isEnabled: true,
            },
            {
              name: "unlimited_volunteer_teams",
              description: "Can create unlimited volunteer teams",
              isEnabled: true,
            },
            {
              name: "priority_support",
              description: "Priority customer support",
              isEnabled: true,
            },
          ],
          description:
            "Complete solution for large organizations and church networks",
        },
      ];

      for (const subscriptionData of defaultSubscriptions) {
        const existing = await Subscription.findOne({
          name: subscriptionData.name,
        });
        if (!existing) {
          await Subscription.create(subscriptionData);
          console.log(
            `✅ Created ${subscriptionData.displayName} subscription`
          );
        }
      }

      console.log("✅ Default subscriptions initialized");
    } catch (error) {
      console.error("❌ Error initializing default subscriptions:", error);
    }
  }

  /**
   * Get user's current subscription
   */
  static async getUserSubscription(userId) {
    try {
      const userSubscription =
        await UserSubscription.getCurrentSubscription(userId);

      if (!userSubscription) {
        // Return free subscription if no active subscription found
        const freeSubscription = await Subscription.findByName("free");
        if (freeSubscription) {
          return {
            subscription: freeSubscription,
            userSubscription: null,
            isFree: true,
          };
        }
      }

      return {
        subscription: userSubscription?.subscriptionId,
        userSubscription,
        isFree:
          !userSubscription || userSubscription.subscriptionName === "free",
      };
    } catch (error) {
      console.error("Error getting user subscription:", error);
      throw error;
    }
  }

  /**
   * Check if user can perform an action
   */
  static async canPerformAction(userId, action) {
    try {
      const { subscription, userSubscription, isFree } =
        await this.getUserSubscription(userId);

      if (!subscription) {
        return { canPerform: false, reason: "No subscription found" };
      }

      if (isFree) {
        // Free tier has very limited capabilities
        const freeActions = ["make_donations", "be_added_to_church"];
        if (freeActions.includes(action)) {
          return { canPerform: true, reason: "Free tier action allowed" };
        }
        return { canPerform: false, reason: "Action not allowed in free tier" };
      }

      // Check subscription limits
      const canPerform = subscription.canPerformAction(
        action,
        userSubscription?.usage[action]?.current || 0
      );

      if (!canPerform) {
        const limit = subscription.limits[action];
        const current = userSubscription?.usage[action]?.current || 0;
        return {
          canPerform: false,
          reason: `Limit exceeded: ${current}/${limit} (${action})`,
          limit,
          current,
        };
      }

      return { canPerform: true, reason: "Action allowed" };
    } catch (error) {
      console.error("Error checking action permission:", error);
      return { canPerform: false, reason: "Error checking permissions" };
    }
  }

  /**
   * Increment usage for a user action
   */
  static async incrementUsage(userId, action, amount = 1) {
    try {
      const userSubscription =
        await UserSubscription.getCurrentSubscription(userId);

      if (userSubscription) {
        await userSubscription.incrementUsage(action, amount);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error incrementing usage:", error);
      return false;
    }
  }

  /**
   * Decrement usage for a user action
   */
  static async decrementUsage(userId, action, amount = 1) {
    try {
      const userSubscription =
        await UserSubscription.getCurrentSubscription(userId);

      if (userSubscription) {
        await userSubscription.decrementUsage(action, amount);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Error decrementing usage:", error);
      return false;
    }
  }

  /**
   * Create or upgrade user subscription
   */
  static async createUserSubscription(
    userId,
    subscriptionName,
    billingCycle = "monthly"
  ) {
    try {
      const subscription = await Subscription.findByName(subscriptionName);
      if (!subscription) {
        throw new Error(`Subscription plan '${subscriptionName}' not found`);
      }

      // Cancel any existing active subscription
      await UserSubscription.updateMany(
        { userId, status: "active" },
        { status: "cancelled" }
      );

      // Calculate period dates
      const now = new Date();
      const periodDays = billingCycle === "yearly" ? 365 : 30;
      const endDate = new Date(
        now.getTime() + periodDays * 24 * 60 * 60 * 1000
      );

      // Create new subscription
      const userSubscription = await UserSubscription.create({
        userId,
        subscriptionId: subscription._id,
        subscriptionName,
        billingCycle,
        currentPeriod: {
          start: now,
          end: endDate,
        },
        nextBillingDate: endDate,
        status: "active",
      });

      return userSubscription;
    } catch (error) {
      console.error("Error creating user subscription:", error);
      throw error;
    }
  }

  /**
   * Get subscription usage summary for a user
   */
  static async getUserUsageSummary(userId) {
    try {
      const { subscription, userSubscription, isFree } =
        await this.getUserSubscription(userId);

      if (!subscription) {
        return { error: "No subscription found" };
      }

      const summary = {
        plan: subscription.displayName || "Free",
        isFree,
        limits: {},
        usage: {},
        remaining: {},
        percentages: {},
      };

      // Populate limits and usage
      Object.keys(subscription.limits).forEach((key) => {
        const limit = subscription.limits[key];
        const current = userSubscription?.usage[key]?.current || 0;

        summary.limits[key] = limit === 0 ? "unlimited" : limit;
        summary.usage[key] = current;

        if (limit === 0) {
          summary.remaining[key] = "unlimited";
          summary.percentages[key] = 0;
        } else {
          summary.remaining[key] = Math.max(0, limit - current);
          summary.percentages[key] = Math.round((current / limit) * 100);
        }
      });

      return summary;
    } catch (error) {
      console.error("Error getting usage summary:", error);
      throw error;
    }
  }

  /**
   * Check if user can create a church
   */
  static async canCreateChurch(userId) {
    return this.canPerformAction(userId, "churches");
  }

  /**
   * Check if user can create a donation campaign
   */
  static async canCreateCampaign(userId) {
    return this.canPerformAction(userId, "donationCampaigns");
  }

  /**
   * Check if user can add admin staff
   */
  static async canAddAdminStaff(userId) {
    return this.canPerformAction(userId, "adminStaff");
  }

  /**
   * Check if user can add volunteers
   */
  static async canAddVolunteers(userId) {
    return this.canPerformAction(userId, "volunteers");
  }

  /**
   * Check if user can create volunteer teams
   */
  static async canCreateVolunteerTeams(userId) {
    return this.canPerformAction(userId, "volunteerTeams");
  }

  /**
   * Get available subscription plans
   */
  static async getAvailablePlans() {
    try {
      const plans = await Subscription.getActiveSubscriptions();
      return plans.map((plan) => ({
        id: plan._id,
        name: plan.name,
        displayName: plan.displayName,
        price: plan.price,
        formattedPrice: plan.formattedPrice,
        monthlyPrice: plan.monthlyPrice,
        limits: plan.limits,
        features: plan.features,
        description: plan.description,
      }));
    } catch (error) {
      console.error("Error getting available plans:", error);
      throw error;
    }
  }

  /**
   * Validate subscription upgrade/downgrade
   */
  static async validateSubscriptionChange(userId, newSubscriptionName) {
    try {
      const currentSubscription =
        await UserSubscription.getCurrentSubscription(userId);
      const newSubscription =
        await Subscription.findByName(newSubscriptionName);

      if (!newSubscription) {
        return { valid: false, reason: "New subscription plan not found" };
      }

      if (
        currentSubscription &&
        currentSubscription.subscriptionName === newSubscriptionName
      ) {
        return { valid: false, reason: "Already subscribed to this plan" };
      }

      // Check if downgrade would exceed current usage
      if (currentSubscription) {
        const currentPlan = await Subscription.findById(
          currentSubscription.subscriptionId
        );

        Object.keys(newSubscription.limits).forEach((key) => {
          const newLimit = newSubscription.limits[key];
          const currentUsage = currentSubscription.usage[key]?.current || 0;

          if (newLimit !== 0 && newLimit < currentUsage) {
            return {
              valid: false,
              reason: `Cannot downgrade: current ${key} usage (${currentUsage}) exceeds new plan limit (${newLimit})`,
            };
          }
        });
      }

      return { valid: true };
    } catch (error) {
      console.error("Error validating subscription change:", error);
      return { valid: false, reason: "Error validating subscription change" };
    }
  }
}

module.exports = SubscriptionService;
