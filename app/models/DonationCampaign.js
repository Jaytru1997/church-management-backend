const mongoose = require('mongoose');

const donationCampaignSchema = new mongoose.Schema({
  churchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Campaign title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    required: [true, 'Campaign description is required'],
    trim: true,
    maxlength: [2000, 'Description cannot exceed 2000 characters'],
  },
  shortDescription: {
    type: String,
    trim: true,
    maxlength: [300, 'Short description cannot exceed 300 characters'],
  },
  category: {
    type: String,
    required: [true, 'Campaign category is required'],
    enum: [
      'building', 'outreach', 'equipment', 'events', 'charity', 
      'missionary', 'education', 'healthcare', 'emergency', 'other'
    ],
  },
  targetAmount: {
    type: Number,
    required: [true, 'Target amount is required'],
    min: [0.01, 'Target amount must be greater than 0'],
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP'],
  },
  currentAmount: {
    type: Number,
    default: 0,
    min: [0, 'Current amount cannot be negative'],
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required'],
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  isUrgent: {
    type: Boolean,
    default: false,
  },
  isFeatured: {
    type: Boolean,
    default: false,
  },
  status: {
    type: String,
    enum: ['draft', 'active', 'paused', 'completed', 'cancelled'],
    default: 'draft',
  },
  images: [{
    filename: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Filename cannot exceed 200 characters'],
    },
    originalName: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Original filename cannot exceed 200 characters'],
    },
    mimetype: {
      type: String,
      required: true,
    },
    size: {
      type: Number,
      required: true,
      min: [0, 'File size cannot be negative'],
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    isPrimary: {
      type: Boolean,
      default: false,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  }],
  video: {
    url: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid video URL'],
    },
    platform: {
      type: String,
      enum: ['youtube', 'vimeo', 'facebook', 'other'],
    },
    title: {
      type: String,
      trim: true,
      maxlength: [200, 'Video title cannot exceed 200 characters'],
    },
  },
  updates: [{
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Update title cannot exceed 200 characters'],
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [2000, 'Update content cannot exceed 2000 characters'],
    },
    images: [{
      filename: String,
      url: String,
      caption: {
        type: String,
        trim: true,
        maxlength: [200, 'Caption cannot exceed 200 characters'],
      },
    }],
    isPublic: {
      type: Boolean,
      default: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  }],
  milestones: [{
    amount: {
      type: Number,
      required: true,
      min: [0.01, 'Milestone amount must be greater than 0'],
    },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: [200, 'Milestone title cannot exceed 200 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Milestone description cannot exceed 500 characters'],
    },
    isReached: {
      type: Boolean,
      default: false,
    },
    reachedAt: {
      type: Date,
    },
  }],
  socialSharing: {
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Social sharing title cannot exceed 100 characters'],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [300, 'Social sharing description cannot exceed 300 characters'],
    },
    hashtags: [{
      type: String,
      trim: true,
      maxlength: [30, 'Hashtag cannot exceed 30 characters'],
    }],
    shareCount: {
      type: Number,
      default: 0,
      min: [0, 'Share count cannot be negative'],
    },
  },
  donorWall: {
    isEnabled: {
      type: Boolean,
      default: true,
    },
    showAmounts: {
      type: Boolean,
      default: false,
    },
    showAnonymous: {
      type: Boolean,
      default: true,
    },
    customMessage: {
      type: String,
      trim: true,
      maxlength: [200, 'Custom message cannot exceed 200 characters'],
    },
  },
  settings: {
    allowAnonymous: {
      type: Boolean,
      default: true,
    },
    allowRecurring: {
      type: Boolean,
      default: false,
    },
    minimumAmount: {
      type: Number,
      min: [0, 'Minimum amount cannot be negative'],
    },
    maximumAmount: {
      type: Number,
      min: [0, 'Maximum amount cannot be negative'],
    },
    autoClose: {
      type: Boolean,
      default: false,
    },
    closeOnTarget: {
      type: Boolean,
      default: false,
    },
    allowComments: {
      type: Boolean,
      default: true,
    },
    moderateComments: {
      type: Boolean,
      default: false,
    },
  },
  analytics: {
    totalDonors: {
      type: Number,
      default: 0,
      min: [0, 'Total donors cannot be negative'],
    },
    uniqueDonors: {
      type: Number,
      default: 0,
      min: [0, 'Unique donors cannot be negative'],
    },
    averageDonation: {
      type: Number,
      default: 0,
      min: [0, 'Average donation cannot be negative'],
    },
    largestDonation: {
      type: Number,
      default: 0,
      min: [0, 'Largest donation cannot be negative'],
    },
    pageViews: {
      type: Number,
      default: 0,
      min: [0, 'Page views cannot be negative'],
    },
    shares: {
      type: Number,
      default: 0,
      min: [0, 'Shares cannot be negative'],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  approvedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for progress percentage
donationCampaignSchema.virtual('progressPercentage').get(function() {
  if (this.targetAmount === 0) return 0;
  const percentage = (this.currentAmount / this.targetAmount) * 100;
  return Math.min(Math.round(percentage * 100) / 100, 100); // Round to 2 decimal places, max 100%
});

// Virtual for days remaining
donationCampaignSchema.virtual('daysRemaining').get(function() {
  const today = new Date();
  const endDate = new Date(this.endDate);
  const diffTime = endDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(diffDays, 0);
});

// Virtual for is ended
donationCampaignSchema.virtual('isEnded').get(function() {
  return new Date() > new Date(this.endDate);
});

// Virtual for is target reached
donationCampaignSchema.virtual('isTargetReached').get(function() {
  return this.currentAmount >= this.targetAmount;
});

// Virtual for primary image
donationCampaignSchema.virtual('primaryImage').get(function() {
  const primary = this.images.find(img => img.isPrimary);
  return primary || this.images[0] || null;
});

// Virtual for status color
donationCampaignSchema.virtual('statusColor').get(function() {
  const statusColors = {
    draft: 'secondary',
    active: 'success',
    paused: 'warning',
    completed: 'info',
    cancelled: 'danger',
  };
  return statusColors[this.status] || 'secondary';
});

// Virtual for urgency color
donationCampaignSchema.virtual('urgencyColor').get(function() {
  if (this.isUrgent) return 'danger';
  if (this.daysRemaining <= 7) return 'warning';
  if (this.daysRemaining <= 30) return 'info';
  return 'success';
});

// Indexes for performance
donationCampaignSchema.index({ churchId: 1 });
donationCampaignSchema.index({ status: 1 });
donationCampaignSchema.index({ category: 1 });
donationCampaignSchema.index({ isActive: 1 });
donationCampaignSchema.index({ isFeatured: 1 });
donationCampaignSchema.index({ startDate: 1 });
donationCampaignSchema.index({ endDate: 1 });
donationCampaignSchema.index({ 'analytics.totalDonors': 1 });

// Compound indexes
donationCampaignSchema.index({ churchId: 1, status: 1 });
donationCampaignSchema.index({ churchId: 1, isActive: 1 });
donationCampaignSchema.index({ churchId: 1, category: 1 });
donationCampaignSchema.index({ status: 1, isActive: 1 });

// Pre-save middleware to update analytics
donationCampaignSchema.pre('save', async function(next) {
  if (this.isModified('currentAmount') || this.isModified('analytics.totalDonors')) {
    this.analytics.lastUpdated = new Date();
    
    if (this.analytics.totalDonors > 0) {
      this.analytics.averageDonation = this.currentAmount / this.analytics.totalDonors;
    }
  }
  next();
});

// Pre-save middleware to check milestones
donationCampaignSchema.pre('save', async function(next) {
  if (this.isModified('currentAmount')) {
    this.milestones.forEach(milestone => {
      if (!milestone.isReached && this.currentAmount >= milestone.amount) {
        milestone.isReached = true;
        milestone.reachedAt = new Date();
      }
    });
  }
  next();
});

// Pre-save middleware to auto-close campaign
donationCampaignSchema.pre('save', async function(next) {
  if (this.settings.autoClose && this.isEnded && this.status === 'active') {
    this.status = 'completed';
  }
  
  if (this.settings.closeOnTarget && this.isTargetReached && this.status === 'active') {
    this.status = 'completed';
  }
  
  next();
});

// Instance method to add donation
donationCampaignSchema.methods.addDonation = function(amount, donorId = null) {
  this.currentAmount += amount;
  this.analytics.totalDonors += 1;
  
  if (donorId && !this.analytics.uniqueDonors.includes(donorId)) {
    this.analytics.uniqueDonors += 1;
  }
  
  if (amount > this.analytics.largestDonation) {
    this.analytics.largestDonation = amount;
  }
  
  return this.save();
};

// Instance method to add update
donationCampaignSchema.methods.addUpdate = function(updateData) {
  this.updates.push(updateData);
  return this.save();
};

// Instance method to add milestone
donationCampaignSchema.methods.addMilestone = function(milestoneData) {
  this.milestones.push(milestoneData);
  return this.save();
};

// Instance method to add image
donationCampaignSchema.methods.addImage = function(imageData) {
  if (imageData.isPrimary) {
    // Remove primary flag from other images
    this.images.forEach(img => img.isPrimary = false);
  }
  
  this.images.push(imageData);
  return this.save();
};

// Instance method to remove image
donationCampaignSchema.methods.removeImage = function(filename) {
  this.images = this.images.filter(img => img.filename !== filename);
  return this.save();
};

// Instance method to set primary image
donationCampaignSchema.methods.setPrimaryImage = function(filename) {
  this.images.forEach(img => {
    img.isPrimary = img.filename === filename;
  });
  return this.save();
};

// Instance method to approve campaign
donationCampaignSchema.methods.approve = function(approvedBy) {
  this.status = 'active';
  this.approvedBy = approvedBy;
  this.approvedAt = new Date();
  return this.save();
};

// Instance method to pause campaign
donationCampaignSchema.methods.pause = function() {
  this.status = 'paused';
  return this.save();
};

// Instance method to resume campaign
donationCampaignSchema.methods.resume = function() {
  if (this.isEnded) {
    this.status = 'completed';
  } else {
    this.status = 'active';
  }
  return this.save();
};

// Instance method to cancel campaign
donationCampaignSchema.methods.cancel = function() {
  this.status = 'cancelled';
  this.isActive = false;
  return this.save();
};

// Instance method to add tags
donationCampaignSchema.methods.addTags = function(tags) {
  const newTags = Array.isArray(tags) ? tags : [tags];
  newTags.forEach(tag => {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  });
  return this.save();
};

// Instance method to remove tags
donationCampaignSchema.methods.removeTags = function(tags) {
  const tagsToRemove = Array.isArray(tags) ? tags : [tags];
  this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
  return this.save();
};

// Instance method to increment share count
donationCampaignSchema.methods.incrementShareCount = function() {
  this.socialSharing.shareCount += 1;
  this.analytics.shares += 1;
  return this.save();
};

// Instance method to increment page view
donationCampaignSchema.methods.incrementPageView = function() {
  this.analytics.pageViews += 1;
  return this.save();
};

// Static method to find campaigns by church
donationCampaignSchema.statics.findByChurch = function(churchId, options = {}) {
  const query = { churchId };
  
  if (options.status) query.status = options.status;
  if (options.category) query.category = options.category;
  if (options.isActive !== undefined) query.isActive = options.isActive;
  if (options.isFeatured !== undefined) query.isFeatured = options.isFeatured;
  
  if (options.startDate || options.endDate) {
    query.startDate = {};
    if (options.startDate) query.startDate.$gte = new Date(options.startDate);
    if (options.endDate) query.startDate.$lte = new Date(options.endDate);
  }
  
  return this.find(query);
};

// Static method to find active campaigns
donationCampaignSchema.statics.findActive = function(churchId) {
  return this.find({ 
    churchId, 
    status: 'active', 
    isActive: true,
    endDate: { $gt: new Date() }
  });
};

// Static method to find featured campaigns
donationCampaignSchema.statics.findFeatured = function(churchId) {
  return this.find({ 
    churchId, 
    isFeatured: true, 
    isActive: true,
    status: 'active'
  });
};

// Static method to find urgent campaigns
donationCampaignSchema.statics.findUrgent = function(churchId) {
  return this.find({ 
    churchId, 
    isUrgent: true, 
    isActive: true,
    status: 'active'
  });
};

// Static method to find campaigns by category
donationCampaignSchema.statics.findByCategory = function(churchId, category) {
  return this.find({ 
    churchId, 
    category, 
    isActive: true,
    status: 'active'
  });
};

// Static method to get campaign statistics
donationCampaignSchema.statics.getCampaignStats = async function(churchId) {
  const pipeline = [
    { $match: { churchId: mongoose.Types.ObjectId(churchId) } },
    { $group: {
      _id: null,
      totalCampaigns: { $sum: 1 },
      activeCampaigns: { 
        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
      },
      totalTargetAmount: { $sum: '$targetAmount' },
      totalCurrentAmount: { $sum: '$currentAmount' },
      totalDonors: { $sum: '$analytics.totalDonors' },
      averageProgress: { $avg: '$progressPercentage' }
    } }
  ];

  const result = await this.aggregate(pipeline);
  return result[0] || {
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalTargetAmount: 0,
    totalCurrentAmount: 0,
    totalDonors: 0,
    averageProgress: 0,
  };
};

module.exports = mongoose.model('DonationCampaign', donationCampaignSchema);
