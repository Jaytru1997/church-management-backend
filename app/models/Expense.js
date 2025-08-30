const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  churchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true,
  },
  title: {
    type: String,
    required: [true, 'Expense title is required'],
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
    required: [true, 'Expense amount is required'],
    min: [0.01, 'Amount must be greater than 0'],
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN', 'USD', 'EUR', 'GBP'],
  },
  category: {
    type: String,
    required: [true, 'Expense category is required'],
    enum: [
      'utilities', 'maintenance', 'equipment', 'supplies', 'events', 
      'outreach', 'staff', 'insurance', 'transportation', 'other'
    ],
  },
  subcategory: {
    type: String,
    trim: true,
    maxlength: [100, 'Subcategory cannot exceed 100 characters'],
  },
  expenseDate: {
    type: Date,
    required: [true, 'Expense date is required'],
  },
  dueDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'approved', 'paid', 'cancelled', 'rejected'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank-transfer', 'check', 'card', 'mobile-money'],
    required: [true, 'Payment method is required'],
  },
  paymentDetails: {
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
    // For cards
    cardType: {
      type: String,
      enum: ['debit', 'credit', 'prepaid'],
    },
    lastFourDigits: {
      type: String,
      trim: true,
      maxlength: [4, 'Last four digits cannot exceed 4 characters'],
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
  budget: {
    allocated: {
      type: Number,
      min: [0, 'Allocated budget cannot be negative'],
    },
    remaining: {
      type: Number,
      min: [0, 'Remaining budget cannot be negative'],
    },
    category: {
      type: String,
      trim: true,
      maxlength: [100, 'Budget category cannot exceed 100 characters'],
    },
  },
  approval: {
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    approvedAt: {
      type: Date,
    },
    approvedAmount: {
      type: Number,
      min: [0, 'Approved amount cannot be negative'],
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Approval notes cannot exceed 500 characters'],
    },
  },
  recurring: {
    isRecurring: {
      type: Boolean,
      default: false,
    },
    frequency: {
      type: String,
      enum: ['weekly', 'monthly', 'quarterly', 'yearly'],
    },
    nextDueDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    totalOccurrences: {
      type: Number,
      min: [1, 'Total occurrences must be at least 1'],
    },
    currentOccurrence: {
      type: Number,
      default: 1,
      min: [1, 'Current occurrence must be at least 1'],
    },
  },
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, 'Tag cannot exceed 30 characters'],
  }],
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
      enum: ['general', 'approval', 'payment', 'follow-up', 'other'],
      default: 'general',
    },
  }],
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {},
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for formatted amount
expenseSchema.virtual('formattedAmount').get(function() {
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: this.currency,
  }).format(this.amount);
});

// Virtual for status color
expenseSchema.virtual('statusColor').get(function() {
  const statusColors = {
    pending: 'warning',
    approved: 'info',
    paid: 'success',
    cancelled: 'secondary',
    rejected: 'danger',
  };
  return statusColors[this.status] || 'secondary';
});

// Virtual for priority color
expenseSchema.virtual('priorityColor').get(function() {
  const priorityColors = {
    low: 'success',
    medium: 'warning',
    high: 'danger',
    urgent: 'danger',
  };
  return priorityColors[this.priority] || 'secondary';
});

// Virtual for is overdue
expenseSchema.virtual('isOverdue').get(function() {
  if (!this.dueDate || this.status === 'paid' || this.status === 'cancelled') {
    return false;
  }
  return new Date() > new Date(this.dueDate);
});

// Virtual for days until due
expenseSchema.virtual('daysUntilDue').get(function() {
  if (!this.dueDate) return null;
  
  const today = new Date();
  const dueDate = new Date(this.dueDate);
  const diffTime = dueDate - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays;
});

// Virtual for budget utilization
expenseSchema.virtual('budgetUtilization').get(function() {
  if (!this.budget.allocated || this.budget.allocated === 0) return null;
  
  const utilization = (this.amount / this.budget.allocated) * 100;
  return Math.round(utilization * 100) / 100; // Round to 2 decimal places
});

// Indexes for performance
expenseSchema.index({ churchId: 1 });
expenseSchema.index({ category: 1 });
expenseSchema.index({ status: 1 });
expenseSchema.index({ priority: 1 });
expenseSchema.index({ expenseDate: 1 });
expenseSchema.index({ dueDate: 1 });
expenseSchema.index({ 'approval.requestedBy': 1 });
expenseSchema.index({ 'approval.approvedBy': 1 });

// Compound indexes
expenseSchema.index({ churchId: 1, status: 1 });
expenseSchema.index({ churchId: 1, category: 1 });
expenseSchema.index({ churchId: 1, expenseDate: 1 });
expenseSchema.index({ churchId: 1, 'budget.category': 1 });

// Pre-save middleware to update budget remaining
expenseSchema.pre('save', async function(next) {
  if (this.isModified('amount') && this.budget.allocated) {
    this.budget.remaining = this.budget.allocated - this.amount;
  }
  next();
});

// Pre-save middleware to update recurring expense
expenseSchema.pre('save', async function(next) {
  if (this.isModified('status') && this.status === 'paid' && this.recurring.isRecurring) {
    if (this.recurring.currentOccurrence < this.recurring.totalOccurrences) {
      // Calculate next due date
      const nextDue = new Date(this.expenseDate);
      const frequencyMap = {
        weekly: 7,
        monthly: 30,
        quarterly: 90,
        yearly: 365,
      };
      
      const daysToAdd = frequencyMap[this.recurring.frequency] || 30;
      nextDue.setDate(nextDue.getDate() + daysToAdd);
      
      this.recurring.nextDueDate = nextDue;
      this.recurring.currentOccurrence += 1;
    }
  }
  next();
});

// Instance method to add note
expenseSchema.methods.addNote = function(noteData) {
  this.notes.push(noteData);
  return this.save();
};

// Instance method to add attachment
expenseSchema.methods.addAttachment = function(attachmentData) {
  this.attachments.push(attachmentData);
  return this.save();
};

// Instance method to remove attachment
expenseSchema.methods.removeAttachment = function(filename) {
  this.attachments = this.attachments.filter(attachment => 
    attachment.filename !== filename
  );
  return this.save();
};

// Instance method to approve expense
expenseSchema.methods.approve = function(approvedBy, approvedAmount, notes = null) {
  this.status = 'approved';
  this.approval.approvedBy = approvedBy;
  this.approval.approvedAt = new Date();
  this.approval.approvedAmount = approvedAmount || this.amount;
  
  if (notes) {
    this.approval.notes = notes;
  }
  
  return this.save();
};

// Instance method to reject expense
expenseSchema.methods.reject = function(rejectedBy, notes = null) {
  this.status = 'rejected';
  
  if (notes) {
    this.notes.push({
      content: `Rejected: ${notes}`,
      author: rejectedBy,
      type: 'approval',
    });
  }
  
  return this.save();
};

// Instance method to mark as paid
expenseSchema.methods.markAsPaid = function(paidBy, notes = null) {
  this.status = 'paid';
  
  if (notes) {
    this.notes.push({
      content: `Marked as paid: ${notes}`,
      author: paidBy,
      type: 'payment',
    });
  }
  
  return this.save();
};

// Instance method to add tags
expenseSchema.methods.addTags = function(tags) {
  const newTags = Array.isArray(tags) ? tags : [tags];
  newTags.forEach(tag => {
    if (!this.tags.includes(tag)) {
      this.tags.push(tag);
    }
  });
  return this.save();
};

// Instance method to remove tags
expenseSchema.methods.removeTags = function(tags) {
  const tagsToRemove = Array.isArray(tags) ? tags : [tags];
  this.tags = this.tags.filter(tag => !tagsToRemove.includes(tag));
  return this.save();
};

// Static method to find expenses by church
expenseSchema.statics.findByChurch = function(churchId, options = {}) {
  const query = { churchId };
  
  if (options.status) query.status = options.status;
  if (options.category) query.category = options.category;
  if (options.priority) query.priority = options.priority;
  if (options.budgetCategory) query['budget.category'] = options.budgetCategory;
  
  if (options.startDate || options.endDate) {
    query.expenseDate = {};
    if (options.startDate) query.expenseDate.$gte = new Date(options.startDate);
    if (options.endDate) query.expenseDate.$lte = new Date(options.endDate);
  }
  
  return this.find(query);
};

// Static method to find pending expenses
expenseSchema.statics.findPending = function(churchId) {
  return this.find({ churchId, status: 'pending' });
};

// Static method to find overdue expenses
expenseSchema.statics.findOverdue = function(churchId) {
  const today = new Date();
  return this.find({
    churchId,
    dueDate: { $lt: today },
    status: { $nin: ['paid', 'cancelled'] }
  });
};

// Static method to find expenses by category
expenseSchema.statics.findByCategory = function(churchId, category) {
  return this.find({ churchId, category });
};

// Static method to get expense statistics
expenseSchema.statics.getExpenseStats = async function(churchId, startDate, endDate) {
  const pipeline = [
    { $match: { 
      churchId: mongoose.Types.ObjectId(churchId),
      status: { $in: ['approved', 'paid'] }
    } },
    { $group: {
      _id: {
        category: '$category',
        date: { $dateToString: { format: '%Y-%m', date: '$expenseDate' } }
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
    const matchStage = { $match: { 
      churchId: mongoose.Types.ObjectId(churchId),
      status: { $in: ['approved', 'paid'] }
    } };
    
    if (startDate) matchStage.$match.expenseDate = { $gte: new Date(startDate) };
    if (endDate) matchStage.$match.expenseDate = { ...matchStage.$match.expenseDate, $lte: new Date(endDate) };
    
    pipeline[0] = matchStage;
  }

  return this.aggregate(pipeline);
};

// Static method to get total expenses by period
expenseSchema.statics.getTotalExpenses = async function(churchId, startDate, endDate) {
  const query = { 
    churchId, 
    status: { $in: ['approved', 'paid'] }
  };
  
  if (startDate || endDate) {
    query.expenseDate = {};
    if (startDate) query.expenseDate.$gte = new Date(startDate);
    if (endDate) query.expenseDate.$lte = new Date(endDate);
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

module.exports = mongoose.model('Expense', expenseSchema);
