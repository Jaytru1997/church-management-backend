const mongoose = require('mongoose');

const manualFinancialRecordSchema = new mongoose.Schema({
  churchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true,
  },
  recordType: {
    type: String,
    enum: ['donation', 'expense', 'income', 'transfer', 'adjustment'],
    required: [true, 'Record type is required'],
  },
  title: {
    type: String,
    required: [true, 'Record title is required'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP'],
  },
  category: {
    type: String,
    required: [true, 'Category is required'],
    trim: true,
    maxlength: [100, 'Category cannot exceed 100 characters'],
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [100, 'Subcategory cannot exceed 100 characters'],
  },
  transactionDate: {
    type: Date,
    required: [true, 'Transaction date is required'],
  },
  recordedDate: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected', 'cancelled'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  source: {
    type: String,
    enum: ['cash', 'bank', 'check', 'mobile-money', 'other'],
    required: [true, 'Source is required'],
  },
  sourceDetails: {
    // For bank transactions
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
    reference: {
      type: String,
      trim: true,
      maxlength: [100, 'Reference cannot exceed 100 characters'],
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
    // For other sources
    details: {
      type: String,
      trim: true,
      maxlength: [200, 'Source details cannot exceed 200 characters'],
    },
  },
  donor: {
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Donor name cannot exceed 200 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^0[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
    isAnonymous: {
      type: Boolean,
      default: false,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
    },
  },
  vendor: {
    name: {
      type: String,
      trim: true,
      maxlength: [200, 'Vendor name cannot exceed 200 characters'],
    },
    contactPerson: {
      type: String,
      trim: true,
      maxlength: [100, 'Contact person cannot exceed 100 characters'],
    },
    phone: {
      type: String,
      trim: true,
      match: [/^0[789][01]\d{8}$/, 'Please enter a valid Nigerian phone number'],
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    },
    address: {
      type: String,
      trim: true,
      maxlength: [500, 'Address cannot exceed 500 characters'],
    },
  },
  attachments: [{
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
  verification: {
    verifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    verifiedAt: {
      type: Date,
    },
    verificationMethod: {
      type: String,
      enum: ['document', 'witness', 'bank-statement', 'receipt', 'other'],
    },
    verificationNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Verification notes cannot exceed 500 characters'],
    },
    confidence: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
  },
  reconciliation: {
    isReconciled: {
      type: Boolean,
      default: false,
    },
    reconciledAt: {
      type: Date,
    },
    reconciledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    reconciliationNotes: {
      type: String,
      trim: true,
      maxlength: [500, 'Reconciliation notes cannot exceed 500 characters'],
    },
    bankStatementMatch: {
      type: Boolean,
      default: false,
    },
    bankStatementReference: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank statement reference cannot exceed 100 characters'],
    },
  },
  notes: [{
    date: {
      type: Date,
      default: Date.now,
    },
    content: {
      type: String,
      required: true,
      trim: true,
      maxlength: [500, 'Note content cannot exceed 500 characters'],
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['general', 'verification', 'reconciliation', 'follow-up', 'other'],
      default: 'general',
    },
  }],
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
  lastModifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  lastModifiedAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for formatted amount
manualFinancialRecordSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency,
  }).format(this.amount);
});

// Virtual for status color
manualFinancialRecordSchema.virtual('statusColor').get(function() {
  const statusColors = {
    pending: 'warning',
    verified: 'success',
    rejected: 'danger',
    cancelled: 'secondary',
  };
  return statusColors[this.status] || 'secondary';
});

// Virtual for priority color
manualFinancialRecordSchema.virtual('priorityColor').get(function() {
  const priorityColors = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    urgent: 'danger',
  };
  return priorityColors[this.priority] || 'secondary';
});

// Virtual for days since transaction
manualFinancialRecordSchema.virtual('daysSinceTransaction').get(function() {
  const today = new Date();
  const transactionDate = new Date(this.transactionDate);
  const diffTime = today - transactionDate;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
});

// Virtual for is overdue for verification
manualFinancialRecordSchema.virtual('isOverdueForVerification').get(function() {
  if (this.status !== 'pending') return false;
  const daysSince = this.daysSinceTransaction;
  return daysSince > 7; // Consider overdue after 7 days
});

// Virtual for verification confidence color
manualFinancialRecordSchema.virtual('confidenceColor').get(function() {
  const confidenceColors = {
    low: 'danger',
    medium: 'warning',
    high: 'success',
  };
  return confidenceColors[this.verification.confidence] || 'secondary';
});

// Indexes for performance
manualFinancialRecordSchema.index({ churchId: 1 });
manualFinancialRecordSchema.index({ recordType: 1 });
manualFinancialRecordSchema.index({ category: 1 });
manualFinancialRecordSchema.index({ status: 1 });
manualFinancialRecordSchema.index({ priority: 1 });
manualFinancialRecordSchema.index({ transactionDate: 1 });
manualFinancialRecordSchema.index({ recordedDate: 1 });
manualFinancialRecordSchema.index({ source: 1 });
manualFinancialRecordSchema.index({ 'verification.verifiedBy': 1 });
manualFinancialRecordSchema.index({ 'reconciliation.isReconciled': 1 });

// Compound indexes
manualFinancialRecordSchema.index({ churchId: 1, recordType: 1 });
manualFinancialRecordSchema.index({ churchId: 1, status: 1 });
manualFinancialRecordSchema.index({ churchId: 1, transactionDate: 1 });
manualFinancialRecordSchema.index({ churchId: 1, 'verification.isReconciled': 1 });

// Pre-save middleware to update last modified
manualFinancialRecordSchema.pre('save', function(next) {
  if (this.isModified()) {
    this.lastModifiedAt = new Date();
  }
  next();
});

// Instance method to add note
manualFinancialRecordSchema.methods.addNote = function(noteData) {
  this.notes.push(noteData);
  return this.save();
};

// Instance method to add attachment
manualFinancialRecordSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push(attachmentData);
  return this.save();
};

// Instance method to remove attachment
manualFinancialRecordSchema.methods.removeAttachment = function(filename) {
  this.attachments = this.attachments.filter(attachment => 
    attachment.filename !== filename
  );
  return this.save();
};

// Instance method to verify record
manualFinancialRecordSchema.methods.verify = function(verifiedBy, verificationData) {
  this.status = 'verified';
  this.verification.verifiedBy = verifiedBy;
  this.verification.verifiedAt = new Date();
  
  if (verificationData.verificationMethod) {
    this.verification.verificationMethod = verificationData.verificationMethod;
  }
  
  if (verificationData.verificationNotes) {
    this.verification.verificationNotes = verificationData.verificationNotes;
  }
  
  if (verificationData.confidence) {
    this.verification.confidence = verificationData.confidence;
  }
  
  return this.save();
};

// Instance method to reject record
manualFinancialRecordSchema.methods.reject = function(rejectedBy, notes = null) {
  this.status = 'rejected';
  
  if (notes) {
    this.notes.push({
      content: `Rejected: ${notes}`,
      author: rejectedBy,
      type: 'verification',
    });
  }
  
  return this.save();
};

// Instance method to mark as reconciled
manualFinancialRecordSchema.methods.markAsReconciled = function(reconciledBy, reconciliationData) {
  this.reconciliation.isReconciled = true;
  this.reconciliation.reconciledAt = new Date();
  this.reconciliation.reconciledBy = reconciledBy;
  
  if (reconciliationData.reconciliationNotes) {
    this.reconciliation.reconciliationNotes = reconciliationData.reconciliationNotes;
  }
  
  if (reconciliationData.bankStatementMatch !== undefined) {
    this.reconciliation.bankStatementMatch = reconciliationData.bankStatementMatch;
  }
  
  if (reconciliationData.bankStatementReference) {
    this.reconciliation.bankStatementReference = reconciliationData.bankStatementReference;
  }
  
  return this.save();
};

// Instance method to add tags
manualFinancialRecordSchema.methods.addTags = function(tags) {
  const newTags = Array.isArray(tags) ? tags : [tags];
  newTags.forEach(tag => {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  });
  return this.save();
};

// Instance method to remove tags
manualFinancialRecordSchema.methods.removeTags = function(tags) {
  const tagsToRemove = Array.isArray(tags) ? tags : [tags];
  this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
  return this.save();
};

// Static method to find records by church
manualFinancialRecordSchema.statics.findByChurch = function(churchId, options = {}) {
  const query = { churchId };
  
  if (options.recordType) query.recordType = options.recordType;
  if (options.category) query.category = options.category;
  if (options.status) query.status = options.status;
  if (options.priority) query.priority = options.priority;
  if (options.source) query.source = options.source;
  if (options.isReconciled !== undefined) query['reconciliation.isReconciled'] = options.isReconciled;
  
  if (options.startDate || options.endDate) {
    query.transactionDate = {};
    if (options.startDate) query.transactionDate.$gte = new Date(options.startDate);
    if (options.endDate) query.transactionDate.$lte = new Date(options.endDate);
  }
  
  return this.find(query);
};

// Static method to find pending records
manualFinancialRecordSchema.statics.findPending = function(churchId) {
  return this.find({ churchId, status: 'pending' });
};

// Static method to find unverified records
manualFinancialRecordSchema.statics.findUnverified = function(churchId) {
  return this.find({ 
    churchId, 
    status: { $in: ['pending', 'rejected'] }
  });
};

// Static method to find unreconciled records
manualFinancialRecordSchema.statics.findUnreconciled = function(churchId) {
  return this.find({ 
    churchId, 
    'reconciliation.isReconciled': false,
    status: 'verified'
  });
};

// Static method to find records by type
manualFinancialRecordSchema.statics.findByType = function(churchId, recordType) {
  return this.find({ churchId, recordType });
};

// Static method to get record statistics
manualFinancialRecordSchema.statics.getRecordStats = async function(churchId, startDate, endDate) {
  const pipeline = [
    { $match: { 
      churchId: mongoose.Types.ObjectId(churchId),
      status: 'verified'
    } },
    { $group: {
      _id: {
        recordType: '$recordType',
        category: '$category',
        date: { $dateToString: { format: '%Y-%m', date: '$transactionDate' } }
      },
      totalAmount: { $sum: '$amount' },
      count: { $sum: 1 }
    } },
    { $group: {
      _id: {
        recordType: '$_id.recordType',
        category: '$_id.category'
      },
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
    const matchStage = { $match: { 
      churchId: mongoose.Types.ObjectId(churchId),
      status: 'verified'
    } };
    
    if (startDate) matchStage.$match.transactionDate = { $gte: new Date(startDate) };
    if (endDate) matchStage.$match.transactionDate = { ...matchStage.$match.transactionDate, $lte: new Date(endDate) };
    
    pipeline[0] = matchStage;
  }

  return this.aggregate(pipeline);
};

// Static method to get total records by period
manualFinancialRecordSchema.statics.getTotalRecords = async function(churchId, startDate, endDate) {
  const query = { 
    churchId, 
    status: 'verified'
  };
  
  if (startDate || endDate) {
    query.transactionDate = {};
    if (startDate) query.transactionDate.$gte = new Date(startDate);
    if (endDate) query.transactionDate.$lte = new Date(endDate);
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

module.exports = mongoose.model('ManualFinancialRecord', manualFinancialRecordSchema);
