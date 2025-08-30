const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
require("dotenv").config();

const authRoutes = require("./app/routes/auth");
const churchRoutes = require("./app/routes/churches");
const memberRoutes = require("./app/routes/members");
const volunteerTeamRoutes = require("./app/routes/volunteerTeams");
const donationRoutes = require("./app/routes/donations");
const expenseRoutes = require("./app/routes/expenses");
const campaignRoutes = require("./app/routes/campaigns");
const financialRecordRoutes = require("./app/routes/financialRecords");
const notificationRoutes = require("./app/routes/notifications");
const subscriptionRoutes = require("./app/routes/subscriptions");

const errorHandler = require("./app/middleware/errorHandler");
const { connectDB } = require("./config/database");

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());
app.use(compression());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: "Too many requests from this IP, please try again later.",
});
app.use("/api/", limiter);

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// CORS configuration
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

// Logging middleware
if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

// Health check endpoint
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Church Management Backend is running",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/churches", churchRoutes);
app.use("/api/members", memberRoutes);
app.use("/api/volunteer-teams", volunteerTeamRoutes);
app.use("/api/donations", donationRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/campaigns", campaignRoutes);
app.use("/api/financial-records", financialRecordRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/subscriptions", subscriptionRoutes);

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    await connectDB();
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

module.exports = app;
