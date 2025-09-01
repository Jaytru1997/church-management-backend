const mongoose = require("mongoose");
require("dotenv").config();

const Subscription = require("../app/models/Subscription");

const defaultSubscriptions = [
  {
    name: "free",
    displayName: "Free Plan",
    price: {
      amount: 0,
      currency: "USD",
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
        description: "User registration and login",
        isEnabled: true,
      },
      {
        name: "make_donations",
        description: "Make donations to existing campaigns",
        isEnabled: true,
      },
      {
        name: "be_added_as_member",
        description:
          "Can be added as administrative member or volunteer to existing churches",
        isEnabled: true,
      },
    ],
    isActive: true,
    description:
      "Free tier for basic app usage. Can register, make donations, and be added to existing churches.",
  },
  {
    name: "starter",
    displayName: "Starter Plan",
    price: {
      amount: 2,
      currency: "USD",
      billingCycle: "monthly",
    },
    limits: {
      churches: 1,
      donationCampaigns: 3,
      adminStaff: 3,
      volunteers: -1, // unlimited
      volunteerTeams: -1, // unlimited
    },
    features: [
      {
        name: "user_registration",
        description: "User registration and login",
        isEnabled: true,
      },
      {
        name: "make_donations",
        description: "Make donations to existing campaigns",
        isEnabled: true,
      },
      {
        name: "be_added_as_member",
        description:
          "Can be added as administrative member or volunteer to existing churches",
        isEnabled: true,
      },
      {
        name: "create_church",
        description: "Create one church",
        isEnabled: true,
      },
      {
        name: "create_campaigns",
        description: "Create up to 3 donation campaigns",
        isEnabled: true,
      },
      {
        name: "add_admin_staff",
        description: "Add up to 3 admin staff members",
        isEnabled: true,
      },
      {
        name: "unlimited_volunteers",
        description: "Add unlimited volunteers and volunteer teams",
        isEnabled: true,
      },
    ],
    isActive: true,
    description:
      "Starter plan for small churches. Create one church, three campaigns, and add three admin staff with unlimited volunteers.",
  },
  {
    name: "organisation",
    displayName: "Organisation Plan",
    price: {
      amount: 6,
      currency: "USD",
      billingCycle: "monthly",
    },
    limits: {
      churches: -1, // unlimited
      donationCampaigns: -1, // unlimited
      adminStaff: -1, // unlimited
      volunteers: -1, // unlimited
      volunteerTeams: -1, // unlimited
    },
    features: [
      {
        name: "user_registration",
        description: "User registration and login",
        isEnabled: true,
      },
      {
        name: "make_donations",
        description: "Make donations to existing campaigns",
        isEnabled: true,
      },
      {
        name: "be_added_as_member",
        description:
          "Can be added as administrative member or volunteer to existing churches",
        isEnabled: true,
      },
      {
        name: "create_churches",
        description: "Create unlimited churches",
        isEnabled: true,
      },
      {
        name: "create_campaigns",
        description: "Create unlimited donation campaigns",
        isEnabled: true,
      },
      {
        name: "add_admin_staff",
        description: "Add unlimited admin staff members",
        isEnabled: true,
      },
      {
        name: "unlimited_volunteers",
        description: "Add unlimited volunteers and volunteer teams",
        isEnabled: true,
      },
      {
        name: "advanced_analytics",
        description: "Access to advanced analytics and reporting",
        isEnabled: true,
      },
      {
        name: "priority_support",
        description: "Priority customer support",
        isEnabled: true,
      },
    ],
    isActive: true,
    description:
      "Organisation plan for large churches and multi-church organizations. Unlimited everything with advanced features.",
  },
];

const initializeSubscriptions = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("✅ Connected to MongoDB");

    // Clear existing subscriptions
    await Subscription.deleteMany({});
    console.log("🗑️  Cleared existing subscriptions");

    // Insert default subscriptions
    const subscriptions = await Subscription.insertMany(defaultSubscriptions);
    console.log(`✅ Created ${subscriptions.length} subscription plans:`);

    subscriptions.forEach((sub) => {
      console.log(
        `   - ${sub.displayName}: ${sub.price.amount} ${sub.price.currency}/${sub.price.billingCycle}`
      );
    });

    console.log("\n🎉 Subscription plans initialized successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error initializing subscriptions:", error);
    process.exit(1);
  }
};

// Run the initialization
initializeSubscriptions();
