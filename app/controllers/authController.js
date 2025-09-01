const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const User = require("../models/User");
const emailService = require("../../config/email");
const { sendNotification } = require("../../config/pusher");

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, password, role } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        error: { message: "User with this email already exists" },
      });
    }

    // Create user
    const user = await User.create({
      firstName,
      lastName,
      email,
      phone,
      password,
      role: role || "member",
    });

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Send welcome email
    try {
      await emailService.sendWelcomeEmail(
        email,
        user.fullName,
        "Church Sphere"
      );
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      // Don't fail registration if email fails
    }

    // Send real-time notification
    sendNotification("auth", "user-registered", {
      userId: user._id,
      email: user.email,
      role: user.role,
    });

    res.status(201).json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          churches: user.churches,
        },
        tokens: {
          authToken,
          refreshToken,
        },
      },
      message: "User registered successfully",
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Registration failed" },
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        success: false,
        error: { message: "Invalid credentials" },
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: "Account is deactivated" },
      });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: { message: "Invalid credentials" },
      });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const authToken = user.generateAuthToken();
    const refreshToken = user.generateRefreshToken();

    // Send real-time notification
    sendNotification("auth", "user-logged-in", {
      userId: user._id,
      email: user.email,
      lastLogin: user.lastLogin,
    });

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          churches: user.churches,
          lastLogin: user.lastLogin,
        },
        tokens: {
          authToken,
          refreshToken,
        },
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Login failed" },
    });
  }
};

// @desc    Refresh JWT token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: { message: "Refresh token is required" },
      });
    }

    // Verify refresh token
    const decoded = jwt.verify(
      token,
      process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET
    );

    // Get user
    const user = await User.findById(decoded.id);
    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        error: { message: "Invalid refresh token" },
      });
    }

    // Generate new tokens
    const authToken = user.generateAuthToken();
    const newRefreshToken = user.generateRefreshToken();

    res.json({
      success: true,
      data: {
        tokens: {
          authToken,
          refreshToken: newRefreshToken,
        },
      },
      message: "Token refreshed successfully",
    });
  } catch (error) {
    console.error("Token refresh error:", error);
    if (error.name === "JsonWebTokenError") {
      return res.status(401).json({
        success: false,
        error: { message: "Invalid refresh token" },
      });
    }
    if (error.name === "TokenExpiredError") {
      return res.status(401).json({
        success: false,
        error: { message: "Refresh token expired" },
      });
    }
    res.status(500).json({
      success: false,
      error: { message: "Token refresh failed" },
    });
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  try {
    // In a real application, you might want to blacklist the token
    // For now, we'll just return success
    res.json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Logout failed" },
    });
  }
};

// @desc    Send password reset email
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal if user exists or not
      return res.json({
        success: true,
        message:
          "If an account with that email exists, a password reset link has been sent",
      });
    }

    // Generate reset token
    const resetToken = user.generatePasswordResetToken();
    await user.save();

    // Send reset email
    try {
      await emailService.sendPasswordResetEmail(
        email,
        resetToken,
        user.fullName
      );
    } catch (emailError) {
      console.error("Password reset email failed:", emailError);
      return res.status(500).json({
        success: false,
        error: { message: "Failed to send password reset email" },
      });
    }

    res.json({
      success: true,
      message: "Password reset email sent successfully",
    });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Password reset request failed" },
    });
  }
};

// @desc    Reset password with token
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Find user with reset token
    const user = await User.findOne({
      "passwordReset.token": token,
      "passwordReset.expires": { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid or expired reset token" },
      });
    }

    // Update password
    user.password = password;
    user.passwordReset.token = undefined;
    user.passwordReset.expires = undefined;
    await user.save();

    // Send confirmation email
    try {
      await emailService.sendWelcomeEmail(
        user.email,
        user.fullName,
        "Church Sphere"
      );
    } catch (emailError) {
      console.error("Password reset confirmation email failed:", emailError);
    }

    res.json({
      success: true,
      message: "Password reset successful",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Password reset failed" },
    });
  }
};

// @desc    Verify email address
// @route   POST /api/auth/verify-email
// @access  Public
const verifyEmail = async (req, res) => {
  try {
    const { token } = req.body;

    const user = await User.findOne({
      "emailVerification.token": token,
      "emailVerification.expires": { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid or expired verification token" },
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerification.token = undefined;
    user.emailVerification.expires = undefined;
    await user.save();

    res.json({
      success: true,
      message: "Email verified successfully",
    });
  } catch (error) {
    console.error("Email verification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Email verification failed" },
    });
  }
};

// @desc    Resend email verification
// @route   POST /api/auth/resend-verification
// @access  Private
const resendVerification = async (req, res) => {
  try {
    const user = req.user;

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        error: { message: "Email is already verified" },
      });
    }

    // Generate new verification token
    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    // Send verification email
    try {
      await emailService.sendWelcomeEmail(
        user.email,
        user.fullName,
        "Church Sphere"
      );
    } catch (emailError) {
      console.error("Verification email failed:", emailError);
      return res.status(500).json({
        success: false,
        error: { message: "Failed to send verification email" },
      });
    }

    res.json({
      success: true,
      message: "Verification email sent successfully",
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to resend verification email" },
    });
  }
};

// @desc    Get current user profile
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).populate("churches.churchId");

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          churches: user.churches,
          preferences: user.preferences,
          lastLogin: user.lastLogin,
          createdAt: user.createdAt,
        },
      },
    });
  } catch (error) {
    console.error("Get profile error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get profile" },
    });
  }
};

// @desc    Update current user profile
// @route   PUT /api/auth/me
// @access  Private
const updateProfile = async (req, res) => {
  try {
    const { firstName, lastName, phone } = req.body;
    const user = req.user;

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (phone) user.phone = phone;

    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          profilePicture: user.profilePicture,
          isEmailVerified: user.isEmailVerified,
          isActive: user.isActive,
          churches: user.churches,
          preferences: user.preferences,
          lastLogin: user.lastLogin,
          updatedAt: user.updatedAt,
        },
      },
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to update profile" },
    });
  }
};

// @desc    Change user password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = req.user;

    // Verify current password
    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        error: { message: "Current password is incorrect" },
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to change password" },
    });
  }
};

// @desc    Update user preferences
// @route   PUT /api/auth/preferences
// @access  Private
const updatePreferences = async (req, res) => {
  try {
    const { notifications, language, timezone } = req.body;
    const user = req.user;

    // Update preferences
    if (notifications) {
      user.preferences.notifications = {
        ...user.preferences.notifications,
        ...notifications,
      };
    }
    if (language) user.preferences.language = language;
    if (timezone) user.preferences.timezone = timezone;

    await user.save();

    res.json({
      success: true,
      data: {
        preferences: user.preferences,
      },
      message: "Preferences updated successfully",
    });
  } catch (error) {
    console.error("Update preferences error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to update preferences" },
    });
  }
};

// @desc    Delete current user account
// @route   DELETE /api/auth/me
// @access  Private
const deleteAccount = async (req, res) => {
  try {
    const { password } = req.body;
    const user = req.user;

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return res.status(400).json({
        success: false,
        error: { message: "Password is incorrect" },
      });
    }

    // Deactivate account instead of deleting
    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "Account deactivated successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to deactivate account" },
    });
  }
};

// @desc    Get all users (admin only)
// @route   GET /api/auth/users
// @access  Private (Admin)
const getAllUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select("-password")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments();

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all users error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get users" },
    });
  }
};

// @desc    Get user by ID (admin only)
// @route   GET /api/auth/users/:id
// @access  Private (Admin)
const getUserById = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }

    res.json({
      success: true,
      data: { user },
    });
  } catch (error) {
    console.error("Get user by ID error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get user" },
    });
  }
};

// @desc    Update user by ID (admin only)
// @route   PUT /api/auth/users/:id
// @access  Private (Admin)
const updateUser = async (req, res) => {
  try {
    const { firstName, lastName, email, phone, role, isActive } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }

    // Update fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;
    if (email) user.email = email;
    if (phone) user.phone = phone;
    if (role) user.role = role;
    if (typeof isActive === "boolean") user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          phone: user.phone,
          role: user.role,
          isActive: user.isActive,
          updatedAt: user.updatedAt,
        },
      },
      message: "User updated successfully",
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to update user" },
    });
  }
};

// @desc    Delete user by ID (admin only)
// @route   DELETE /api/auth/users/:id
// @access  Private (Admin)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }

    // Deactivate instead of delete
    user.isActive = false;
    user.deactivatedAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to deactivate user" },
    });
  }
};

// @desc    Activate user account (admin only)
// @route   POST /api/auth/users/:id/activate
// @access  Private (Admin)
const activateUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }

    user.isActive = true;
    user.deactivatedAt = undefined;
    await user.save();

    res.json({
      success: true,
      message: "User activated successfully",
    });
  } catch (error) {
    console.error("Activate user error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to activate user" },
    });
  }
};

// @desc    Deactivate user account (admin only)
// @route   POST /api/auth/users/:id/deactivate
// @access  Private (Admin)
const deactivateUser = async (req, res) => {
  try {
    const { reason } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: "User not found" },
      });
    }

    user.isActive = false;
    user.deactivatedAt = new Date();
    if (reason) {
      user.deactivationReason = reason;
    }
    await user.save();

    res.json({
      success: true,
      message: "User deactivated successfully",
    });
  } catch (error) {
    console.error("Deactivate user error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to deactivate user" },
    });
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  logout,
  forgotPassword,
  resetPassword,
  verifyEmail,
  resendVerification,
  getMe,
  updateProfile,
  changePassword,
  updatePreferences,
  deleteAccount,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser,
  activateUser,
  deactivateUser,
};
