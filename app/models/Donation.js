const mongoose = require('mongoose');

const donationSchema = new mongoose.Schema({
  churchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true,
  },
  donorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true,
  },
  campaignId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'DonationCampaign',
  },
  amount: {
    type: Number,
    required: [true, 'Donation amount is required'],
    min: [0.01, 'Donation amount must be greater than 0'],
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP'],
  },
  category: {
    type: String,
    required: [true, 'Donation category is required'],
    trim: true,
    maxlength: [50, 'Category cannot exceed 50 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [200, 'Description cannot exceed 200 characters'],
  },
  paymentMethod: {
    type: String,
    enum: ['online', 'cash', 'bank-transfer', 'check', 'mobile-money'],
    required: [true, 'Payment method is required'],
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending',
  },
  paymentDetails: {
    // For online payments (Monnify)
    transactionReference: {
      type: String,
      trim: true,
    },
    paymentReference: {
      type: String,
      trim: true,
    },
    gateway: {
      type: String,
      enum: ['monnify', 'paystack', 'flutterwave', 'other'],
    },
    gatewayResponse: {
      type: mongoose.Schema.Types.Mixed,
    },
    // For bank transfers
    bankName: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank name cannot exceed 100 characters'],
    },
    accountNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Account number cannot exceed 20 characters'],
    },
    accountName: {
      type: String,
      trim: true,
      maxlength: [100, 'Account name cannot exceed 100 characters'],
    },
    // For checks
    checkNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Check number cannot exceed 20 characters'],
    },
    bankBranch: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank branch cannot exceed 100 characters'],
    },
    // For mobile money
    provider: {
      type: String,
      trim: true,
      maxlength: [50, 'Provider cannot exceed 50 characters'],
    },
    phoneNumber: {
      type: String,
      trim: true,
      match: [/^0[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number'],
    },
  },
  donorInfo: {
    name: {
      type: String,
      required: [true, 'Donor name is required'],
      trim: true,
      maxlength: [100, 'Donor name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^0[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number'],
    },
    address: {
      street: {
        type: String,
        trim: true,
        maxlength: [200, 'Street address cannot exceed 200 characters'],
      },
      city: {
        type: String,
        trim: true,
        maxlength: [100, 'City name cannot exceed 100 characters'],
      },
      state: {
        type: String,
        trim: true,
        maxlength: [100, 'State name cannot exceed 100 characters'],
      },
      country: {
        type: String,
        default: 'Nigeria',
        trim: true,
      },
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    recurringFrequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    },
    recurringEndDate: {
      type: Date,
    },
  },
  receipt: {
    number: {
      type: String,
      unique: true,
      sparse: true,
    },
    isGenerated: {
      type: Boolean,
      default: false,
    },
    generatedAt: {
      type: Date,
    },
    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  notes: {
    type: String,
    trim: true,
    maxlength: [500, 'Notes cannot exceed 500 characters'],
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
  recordedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: {
    type: Date,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for formatted amount
donationSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency,
  }).format(this.amount);
});

// Virtual for payment status color
donationSchema.virtual('statusColor').get(function() {
  const statusColors = {
    pending: 'warning',
    processing: 'info',
    completed: 'success',
    failed: 'danger',
    cancelled: 'secondary',
    refunded: 'warning',
  };
  return statusColors[this.status] || 'secondary';
});

// Virtual for is online payment
donationSchema.virtual('isOnlinePayment').get(function() {
  return this.paymentMethod === 'online';
});

// Virtual for is verified
donationSchema.virtual('isVerified').get(function() {
  return this.verifiedBy && this.verifiedAt;
});

// Indexes for performance
donationSchema.index({ churchId: 1 });
donationSchema.index({ donorId: 1 });
donationSchema.index({ campaignId: 1 });
donationSchema.index({ status: 1 });
donationSchema.index({ paymentMethod: 1 });
donationSchema.index({ category: 1 });
donationSchema.index({ createdAt: 1 });
donationSchema.index({ 'paymentDetails.transactionReference': 1 });
donationSchema.index({ 'paymentDetails.paymentReference': 1 });

// Compound indexes
donationSchema.index({ churchId: 1, status: 1 });
donationSchema.index({ churchId: 1, category: 1 });
donationSchema.index({ churchId: 1, createdAt: 1 });
donationSchema.index({ churchId: 1, 'donorInfo.isAnonymous': 1 });

// Pre-save middleware to generate receipt number
donationSchema.pre('save', async function(next) {
  if (this.isNew && this.status === 'completed' && !this.receipt.number) {
    try {
      const Church = require('./Church');
      const church = await Church.findById(this.churchId);
      
      if (church) {
        const donationCount = await this.constructor.countDocuments({ 
          churchId: this.churchId,
          status: 'completed'
        });
        
        const year = new Date().getFullYear();
        this.receipt.number = `${church.name.substring(0, 3).toUpperCase()}${year}${String(donationCount + 1).padStart(4, '0')}`;
      }
    } catch (error) {
      console.error('Error generating receipt number:', error);
    }
  }
  next();
});

// Pre-save middleware to update member donation stats
donationSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'completed') {
    try {
      const Member = require('./Member');
      const member = await Member.findById(this.donorId);
      
      if (member) {
        member.financial.totalDonations += this.amount;
        member.financial.lastDonationDate = new Date();
        await member.save();
      }
    } catch (error) {
      console.error('Error updating member donation stats:', error);
    }
  }
  next();
});

// Instance method to mark as verified
donationSchema.methods.markAsVerified = function(verifiedBy) {
  this.verifiedBy = verifiedBy;
  this.verifiedAt = new Date();
  return this.save();
};

// Instance method to generate receipt
donationSchema.methods.generateReceipt = function(generatedBy) {
  this.receipt.isGenerated = true;
  this.receipt.generatedAt = new Date();
  this.receipt.generatedBy = generatedBy;
  return this.save();
};

// Instance method to update payment status
donationSchema.methods.updatePaymentStatus = function(status, gatewayResponse = null) {
  this.status = status;
  
  if (gatewayResponse) {
    this.paymentDetails.gatewayResponse = gatewayResponse;
  }
  
  if (status === 'completed') {
    this.verifiedAt = new Date();
  }
  
  return this.save();
};

// Instance method to add payment details
donationSchema.methods.addPaymentDetails = function(paymentDetails) {
  Object.assign(this.paymentDetails, paymentDetails);
  return this.save();
};

// Instance method to add tags
donationSchema.methods.addTags = function(tags) {
  const newTags = Array.isArray(tags) ? tags : [tags];
  newTags.forEach(tag => {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  });
  return this.save();
};

// Instance method to remove tags
donationSchema.methods.removeTags = function(tags) {
  const tagsToRemove = Array.isArray(tags) ? tags : [tags];
  this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
  return this.save();
};

// Static method to find donations by church
donationSchema.statics.findByChurch = function(churchId, options = {}) {
  const query = { churchId };
  
  if (options.status) query.status = options.status;
  if (options.category) query.category = options.category;
  if (options.paymentMethod) query.paymentMethod = options.paymentMethod;
  if (options.isAnonymous !== undefined) query['donorInfo.isAnonymous'] = options.isAnonymous;
  
  if (options.startDate || options.endDate) {
    query.createdAt = {};
    if (options.startDate) query.createdAt.$gte = new Date(options.startDate);
    if (options.endDate) query.createdAt.$lte = new Date(options.endDate);
  }
  
  return this.find(query);
};

// Static method to find completed donations
donationSchema.statics.findCompleted = function(churchId) {
  return this.find({ churchId, status: 'completed' });
};

// Static method to find pending donations
donationSchema.statics.findPending = function(churchId) {
  return this.find({ churchId, status: 'pending' });
};

// Static method to find donations by category
donationSchema.statics.findByCategory = function(churchId, category) {
  return this.find({ churchId, category, status: 'completed' });
};

// Static method to get donation statistics
donationSchema.statics.getDonationStats = async function(churchId, startDate, endDate) {
  const pipeline = [
    { $match: { 
      churchId: mongoose.Types.ObjectId(churchId),
      status: 'completed'
    } },
    { $group: {
      _id: {
        category: '$category',
        date: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }
      },
      totalAmount: { $sum: '$amount' },
      count: { $sum: 1 }
    } },
    { $group: {
      _id: '$_id.category',
      monthlyData: {
        $push: {
          month: '$_id.date',
          amount: '$totalAmount',
          count: '$count'
        }
      },
      totalAmount: { $sum: '$totalAmount' },
      totalCount: { $sum: '$count' }
    } },
    { $sort: { totalAmount: -1 } }
  ];

  if (startDate || endDate) {
    const matchStage = { $match: { churchId: mongoose.Types.ObjectId(churchId), status: 'completed' } };
    
    if (startDate) matchStage.$match.createdAt = { $gte: new Date(startDate) };
    if (endDate) matchStage.$match.createdAt = { ...matchStage.$match.createdAt, $lte: new Date(endDate) };
    
    pipeline[0] = matchStage;
  }

  return this.aggregate(pipeline);
};

// Static method to get total donations by period
donationSchema.statics.getTotalDonations = async function(churchId, startDate, endDate) {
  const query = { churchId, status: 'completed' };
  
  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) query.createdAt.$lte = new Date(endDate);
  }
  
  const result = await this.aggregate([
    { $match: query },
    { $group: {
      _id: null,
      totalAmount: { $sum: '$amount' },
      totalCount: { $sum: 1 }
    } }
  ]);
  
  return result[0] || { totalAmount: 0, totalCount: 0 };
};

module.exports = mongoose.model('Donation', donationSchema);
