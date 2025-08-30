#!/usr/bin/env node

/**
 * Basic Test Script for Church Management Backend
 * This script tests the basic functionality without requiring a database connection
 */

const fs = require("fs");
const path = require("path");

console.log("🧪 Running Basic Tests for Church Management Backend\n");

// Test 1: Check if package.json exists and has required dependencies
console.log("1. Checking package.json...");
try {
  const packageJson = JSON.parse(fs.readFileSync("package.json", "utf8"));

  const requiredDeps = [
    "express",
    "mongoose",
    "jsonwebtoken",
    "bcryptjs",
    "cors",
    "helmet",
    "compression",
    "dotenv",
  ];

  const missingDeps = requiredDeps.filter(
    (dep) => !packageJson.dependencies[dep]
  );

  if (missingDeps.length === 0) {
    console.log("✅ All required dependencies found");
  } else {
    console.log("❌ Missing dependencies:", missingDeps.join(", "));
  }

  console.log(`   - Express version: ${packageJson.dependencies.express}`);
  console.log(`   - Mongoose version: ${packageJson.dependencies.mongoose}`);
  console.log(
    `   - Node version required: ${packageJson.engines?.node || "Not specified"}`
  );
} catch (error) {
  console.log("❌ Error reading package.json:", error.message);
}

// Test 2: Check if main server file exists
console.log("\n2. Checking main server file...");
const serverFile = "server.js";
if (fs.existsSync(serverFile)) {
  console.log("✅ server.js found");

  // Check if it's a valid JavaScript file
  try {
    const serverContent = fs.readFileSync(serverFile, "utf8");
    if (
      serverContent.includes("express") &&
      serverContent.includes("mongoose")
    ) {
      console.log("✅ server.js appears to be valid");
    } else {
      console.log("⚠️  server.js content seems incomplete");
    }
  } catch (error) {
    console.log("❌ Error reading server.js:", error.message);
  }
} else {
  console.log("❌ server.js not found");
}

// Test 3: Check if environment file exists
console.log("\n3. Checking environment configuration...");
const envFile = ".env";
if (fs.existsSync(envFile)) {
  console.log("✅ .env file found");

  // Check for required environment variables
  const envContent = fs.readFileSync(envFile, "utf8");
  const requiredEnvVars = [
    "MONGO_URI",
    "JWT_SECRET",
    "MONNIFY_API_KEY",
    "PUSHER_APP_ID",
    "MAIL_HOST",
  ];

  const missingEnvVars = requiredEnvVars.filter(
    (varName) => !envContent.includes(`${varName}=`)
  );

  if (missingEnvVars.length === 0) {
    console.log("✅ All required environment variables found");
  } else {
    console.log(
      "⚠️  Missing environment variables:",
      missingEnvVars.join(", ")
    );
  }
} else {
  console.log("⚠️  .env file not found - you may need to create one");
  console.log("   See CONFIGURATION.md for setup instructions");
}

// Test 4: Check if app directory structure exists
console.log("\n4. Checking application structure...");
const appDir = "app";
if (fs.existsSync(appDir)) {
  console.log("✅ app directory found");

  // Check for subdirectories
  const subdirs = ["routes", "controllers", "models", "middleware"];
  subdirs.forEach((subdir) => {
    const subdirPath = path.join(appDir, subdir);
    if (fs.existsSync(subdirPath)) {
      const files = fs
        .readdirSync(subdirPath)
        .filter((file) => file.endsWith(".js"));
      console.log(`   ✅ ${subdir}/ (${files.length} files)`);
    } else {
      console.log(`   ❌ ${subdir}/ not found`);
    }
  });
} else {
  console.log("❌ app directory not found");
}

// Test 5: Check if config directory exists and contains configuration files
console.log("\n5. Checking configuration files...");
const configDir = "config";
if (fs.existsSync(configDir)) {
  console.log("✅ config directory found");

  const configFiles = ["database.js", "pusher.js"];
  configFiles.forEach((file) => {
    const filePath = path.join(configDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} found`);
    } else {
      console.log(`   ❌ ${file} not found`);
    }
  });

  // Also check for service files in config directory
  console.log("\n6. Checking service files...");
  const serviceFiles = ["monnify.js", "email.js"];
  serviceFiles.forEach((file) => {
    const filePath = path.join(configDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} found`);
    } else {
      console.log(`   ❌ ${file} not found`);
    }
  });
} else {
  console.log("❌ config directory not found");
}

// Test 7: Check if middleware directory exists
console.log("\n7. Checking middleware files...");
const middlewareDir = "app/middleware";
if (fs.existsSync(middlewareDir)) {
  console.log("✅ middleware directory found");

  const middlewareFiles = [
    "auth.js",
    "errorHandler.js",
    "validation.js",
    "subscription.js",
  ];
  middlewareFiles.forEach((file) => {
    const filePath = path.join(middlewareDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} found`);
    } else {
      console.log(`   ❌ ${file} not found`);
    }
  });
} else {
  console.log("❌ middleware directory not found");
}

// Test 8: Check if models directory exists
console.log("\n8. Checking data models...");
const modelsDir = "app/models";
if (fs.existsSync(modelsDir)) {
  console.log("✅ models directory found");

  const modelFiles = [
    "User.js",
    "Church.js",
    "Member.js",
    "VolunteerTeam.js",
    "Donation.js",
    "Expense.js",
    "DonationCampaign.js",
    "ManualFinancialRecord.js",
    "Subscription.js",
    "UserSubscription.js",
  ];

  modelFiles.forEach((file) => {
    const filePath = path.join(modelsDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} found`);
    } else {
      console.log(`   ❌ ${file} not found`);
    }
  });
} else {
  console.log("❌ models directory not found");
}

// Test 9: Check if routes directory exists
console.log("\n9. Checking API routes...");
const routesDir = "app/routes";
if (fs.existsSync(routesDir)) {
  console.log("✅ routes directory found");

  const routeFiles = [
    "auth.js",
    "churches.js",
    "members.js",
    "volunteerTeams.js",
    "donations.js",
    "expenses.js",
    "campaigns.js",
    "financialRecords.js",
    "notifications.js",
    "subscriptions.js",
  ];

  routeFiles.forEach((file) => {
    const filePath = path.join(routesDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} found`);
    } else {
      console.log(`   ❌ ${file} not found`);
    }
  });
} else {
  console.log("❌ routes directory not found");
}

// Test 10: Check if subscription service exists
console.log("\n10. Checking subscription service...");
const subscriptionServicePath = path.join("config", "subscriptionService.js");
if (fs.existsSync(subscriptionServicePath)) {
  console.log("✅ subscriptionService.js found");
} else {
  console.log("❌ subscriptionService.js not found");
}

// Test 11: Check if subscription initialization script exists
console.log("\n11. Checking subscription initialization script...");
const initScriptPath = path.join("scripts", "init-subscriptions.js");
if (fs.existsSync(initScriptPath)) {
  console.log("✅ init-subscriptions.js found");
} else {
  console.log("❌ init-subscriptions.js not found");
}

// Test 12: Check if controllers directory exists
console.log("\n12. Checking controllers...");
const controllersDir = "app/controllers";
if (fs.existsSync(controllersDir)) {
  console.log("✅ controllers directory found");

  const controllerFiles = [
    "authController.js",
    "churchController.js",
    "memberController.js",
    "volunteerTeamController.js",
    "donationController.js",
    "expenseController.js",
    "campaignController.js",
    "financialRecordController.js",
    "notificationController.js",
    "subscriptionController.js",
  ];

  controllerFiles.forEach((file) => {
    const filePath = path.join(controllersDir, file);
    if (fs.existsSync(filePath)) {
      console.log(`   ✅ ${file} found`);
    } else {
      console.log(`   ❌ ${file} not found`);
    }
  });
} else {
  console.log("❌ controllers directory not found");
}

// Test 13: Check documentation files
console.log("\n13. Checking documentation...");
const docs = ["README.md", "CONFIGURATION.md"];
docs.forEach((doc) => {
  if (fs.existsSync(doc)) {
    console.log(`   ✅ ${doc} found`);
  } else {
    console.log(`   ❌ ${doc} not found`);
  }
});

// Summary
console.log("\n📊 Test Summary");
console.log("================");

const totalTests = 13;
let passedTests = 0;
let failedTests = 0;

// Count passed/failed tests based on console output
// This is a simplified approach - in a real test framework, you'd track this properly

console.log("\n🎯 Next Steps:");
console.log("1. Install dependencies: npm install");
console.log("2. Configure your .env file (see CONFIGURATION.md)");
console.log("3. Start MongoDB");
console.log("4. Run the application: npm run dev");
console.log("5. Test the health endpoint: curl http://localhost:5000/health");

console.log("\n🚀 Ready to build amazing church management solutions!");
console.log(
  "For detailed setup instructions, see README.md and CONFIGURATION.md"
);
