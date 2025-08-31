const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
      maxlength: [50, "First name cannot exceed 50 characters"],
    },
    lastName: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
      maxlength: [50, "Last name cannot exceed 50 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    phone: {
      type: String,
      trim: true,
      match: [
        /^0[789][01]\d{8}$/,
        "Please enter a valid Nigerian phone number",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters long"],
      select: false, // Don't include password in queries by default
    },
    role: {
      type: String,
      enum: ["admin", "volunteer", "member"],
      default: "member",
    },
    profilePicture: {
      type: String,
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    lastLogin: {
      type: Date,
      default: null,
    },
    churches: [
      {
        churchId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Church",
        },
        role: {
          type: String,
          enum: ["admin", "volunteer", "member"],
          default: "member",
        },
        joinedAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    preferences: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
        sms: { type: Boolean, default: false },
      },
      language: { type: String, default: "en" },
      timezone: { type: String, default: "Africa/Lagos" },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for full name
userSchema.virtual("fullName").get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name
userSchema.virtual("displayName").get(function () {
  return this.fullName;
});

// Indexes for performance
userSchema.index({ email: 1 });
userSchema.index({ phone: 1 });
userSchema.index({ "churches.churchId": 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

// Pre-save middleware to hash password
userSchema.pre("save", async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified("password")) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(
      parseInt(process.env.BCRYPT_ROUNDS) || 12
    );
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Pre-save middleware to update lastLogin
userSchema.pre("save", function (next) {
  if (this.isModified("lastLogin")) {
    this.lastLogin = new Date();
  }
  next();
});

// Instance method to check password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Instance method to generate JWT token
userSchema.methods.generateAuthToken = function () {
  return jwt.sign(
    { id: this._id, email: this.email, role: this.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
  );
};

// Instance method to generate refresh token
userSchema.methods.generateRefreshToken = function () {
  return jwt.sign({ id: this._id, type: "refresh" }, process.env.JWT_SECRET, {
    expiresIn: "30d",
  });
};

// Instance method to generate email verification token
userSchema.methods.generateEmailVerificationToken = function () {
  const token = require("crypto").randomBytes(32).toString("hex");
  this.emailVerificationToken = token;
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  return token;
};

// Instance method to generate password reset token
userSchema.methods.generatePasswordResetToken = function () {
  const token = require("crypto").randomBytes(32).toString("hex");
  this.passwordResetToken = token;
  this.passwordResetExpires = Date.now() + 60 * 60 * 1000; // 1 hour
  return token;
};

// Instance method to add church membership
userSchema.methods.addChurch = function (churchId, role = "member") {
  const existingChurch = this.churches.find(
    (church) => church.churchId.toString() === churchId.toString()
  );

  if (existingChurch) {
    existingChurch.role = role;
    existingChurch.joinedAt = new Date();
  } else {
    this.churches.push({
      churchId,
      role,
      joinedAt: new Date(),
    });
  }

  return this.save();
};

// Instance method to remove church membership
userSchema.methods.removeChurch = function (churchId) {
  this.churches = this.churches.filter(
    (church) => church.churchId.toString() !== churchId.toString()
  );
  return this.save();
};

// Instance method to check church membership
userSchema.methods.isChurchMember = function (churchId) {
  return this.churches.some(
    (church) => church.churchId.toString() === churchId.toString()
  );
};

// Instance method to check church role
userSchema.methods.getChurchRole = function (churchId) {
  const church = this.churches.find(
    (church) => church.churchId.toString() === churchId.toString()
  );
  return church ? church.role : null;
};

// Instance method to update church role
userSchema.methods.updateChurchRole = function (churchId, newRole) {
  const church = this.churches.find(
    (church) => church.churchId.toString() === churchId.toString()
  );

  if (church) {
    church.role = newRole;
    return this.save();
  }

  return Promise.resolve(this);
};

// Static method to find users by church
userSchema.statics.findByChurch = function (churchId, role = null) {
  let query = { "churches.churchId": churchId };

  if (role) {
    query["churches.role"] = role;
  }

  return this.find(query);
};

// Static method to find active users
userSchema.statics.findActive = function () {
  return this.find({ isActive: true });
};

// Static method to find users by role
userSchema.statics.findByRole = function (role) {
  return this.find({ role, isActive: true });
};

module.exports = mongoose.model("User", userSchema);
