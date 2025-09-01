#!/usr/bin/env node

/**
 * Startup Script for Church Management Backend
 * This script helps initialize and start the application
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

console.log("🚀 Church Management Backend Startup Script\n");

// Check if this is a fresh installation
const isFreshInstall = !fs.existsSync("node_modules");

if (isFreshInstall) {
  console.log("📦 Fresh installation detected. Installing dependencies...");
  try {
    execSync("npm install", { stdio: "inherit" });
    console.log("✅ Dependencies installed successfully\n");
  } catch (error) {
    console.log(
      '❌ Failed to install dependencies. Please run "npm install" manually.'
    );
    process.exit(1);
  }
} else {
  console.log("✅ Dependencies already installed\n");
}

// Check if .env file exists
if (!fs.existsSync(".env")) {
  console.log("⚠️  .env file not found. Creating from template...");

  const envTemplate = `# Application Configuration
APP_NAME=Church Management Backend
NODE_ENV=development
PORT=5000
URL=http://localhost:5000
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000

# Database Configuration
MONGO_URI=mongodb://localhost:27017/church-management

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-here-change-this-in-production
JWT_EXPIRES_IN=7d
JWT_COOKIE_EXPIRES_IN=7

# Monnify Payment Gateway Configuration
MONNIFY_API_KEY=your-monnify-api-key
MONNIFY_SECRET_KEY=your-monnify-secret-key
MONNIFY_CONTRACT_CODE=your-monnify-contract-code
MONNIFY_BASE_URL=https://sandbox-api.monnify.com

# Pusher Real-time Configuration
PUSHER_APP_ID=your-pusher-app-id
PUSHER_APP_KEY=your-pusher-app-key
PUSHER_APP_SECRET=your-pusher-app-secret
PUSHER_APP_CLUSTER=your-pusher-cluster

# Email Configuration (Development - Mailtrap)
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=2525
MAILTRAP_USERNAME=your-mailtrap-username
MAILTRAP_PASSWORD=your-mailtrap-password

# Email Configuration (Production)
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_ADDR=your-email@gmail.com
MAIL_SECRET=your-email-app-password
MAIL_DISPLAYNAME=Church Sphere

# Cloudflare Configuration
CLOUDFLARE_API_TOKEN=your-cloudflare-api-token
CLOUDFLARE_ZONE_ID=your-cloudflare-zone-id

# Security Configuration
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100`;

  try {
    fs.writeFileSync(".env", envTemplate);
    console.log("✅ .env file created successfully");
    console.log(
      "⚠️  Please update the .env file with your actual credentials before starting the application\n"
    );
  } catch (error) {
    console.log("❌ Failed to create .env file:", error.message);
    console.log(
      "Please create a .env file manually. See CONFIGURATION.md for details.\n"
    );
  }
} else {
  console.log("✅ .env file found\n");
}

// Check MongoDB connection
console.log("🔍 Checking MongoDB connection...");
try {
  // Try to connect to MongoDB (this will fail if MongoDB is not running)
  const mongoose = require("mongoose");
  mongoose.connect("mongodb://localhost:27017/test", {
    serverSelectionTimeoutMS: 5000,
  });

  mongoose.connection.once("open", () => {
    console.log("✅ MongoDB is running and accessible");
    mongoose.connection.close();
    startApplication();
  });

  mongoose.connection.on("error", () => {
    console.log(
      "❌ MongoDB connection failed. Please ensure MongoDB is running."
    );
    console.log("   Start MongoDB with: mongod");
    console.log(
      "   Or use MongoDB Atlas (cloud) and update MONGO_URI in .env\n"
    );
    startApplication();
  });
} catch (error) {
  console.log(
    "⚠️  Could not check MongoDB connection. Please ensure MongoDB is running.\n"
  );
  startApplication();
}

function startApplication() {
  console.log("🎯 Ready to start the application!\n");

  console.log("📋 Available commands:");
  console.log(
    "   npm run dev     - Start in development mode with auto-reload"
  );
  console.log("   npm start       - Start in production mode");
  console.log("   npm test        - Run tests");
  console.log("   npm run lint    - Check code quality");
  console.log("   npm run format  - Format code\n");

  console.log("🌐 Once started, the application will be available at:");
  console.log("   http://localhost:5000");
  console.log("   Health check: http://localhost:5000/health\n");

  console.log("📚 For detailed setup instructions, see:");
  console.log("   README.md - Complete project documentation");
  console.log("   CONFIGURATION.md - Environment setup guide\n");

  // Ask if user wants to start the application
  console.log("❓ Would you like to start the application now? (y/n)");

  // In a real implementation, you'd use readline or a similar library
  // For now, just provide instructions
  console.log("   Run: npm run dev");

  console.log("\n🚀 Happy coding!");
}
