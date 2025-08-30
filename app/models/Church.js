const mongoose = require('mongoose');

const churchSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Church name is required'],
    trim: true,
    maxlength: [100, 'Church name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  address: {
    street: {
      type: String,
      trim: true,
      maxlength: [200, 'Street address cannot exceed 200 characters'],
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true,
      maxlength: [100, 'City name cannot exceed 100 characters'],
    },
    state: {
      type: String,
      required: [true, 'State is required'],
      trim: true,
      maxlength: [100, 'State name cannot exceed 100 characters'],
    },
    country: {
      type: String,
      default: 'Nigeria',
      trim: true,
    },
    postalCode: {
      type: String,
      trim: true,
      maxlength: [10, 'Postal code cannot exceed 10 characters'],
    },
  },
  contact: {
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
    website: {
      type: String,
      trim: true,
      match: [/^https?:\/\/.+/, 'Please enter a valid website URL'],
    },
  },
  socialMedia: {
    facebook: String,
    twitter: String,
    instagram: String,
    youtube: String,
  },
  logo: {
    type: String,
    default: null,
  },
  banner: {
    type: String,
    default: null,
  },
  foundedDate: {
    type: Date,
  },
  denomination: {
    type: String,
    trim: true,
    maxlength: [100, 'Denomination cannot exceed 100 characters'],
  },
  pastor: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Pastor name cannot exceed 100 characters'],
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
  },
  services: [{
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Service name cannot exceed 100 characters'],
    },
    day: {
      type: String,
      required: true,
      enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
    },
    time: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [200, 'Service description cannot exceed 200 characters'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  settings: {
    currency: {
      type: String,
      default: 'NGN',
      enum: ['NGN', 'USD', 'EUR', 'GBP'],
    },
    timezone: {
      type: String,
      default: 'Africa/Lagos',
    },
    language: {
      type: String,
      default: 'en',
      enum: ['en', 'yo', 'ig', 'ha'],
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false },
    },
    privacy: {
      publicDirectory: { type: Boolean, default: false },
      showDonations: { type: Boolean, default: false },
      showAttendance: { type: Boolean, default: false },
    },
  },
  financial: {
    accountNumber: {
      type: String,
      trim: true,
      maxlength: [20, 'Account number cannot exceed 20 characters'],
    },
    bankName: {
      type: String,
      trim: true,
      maxlength: [100, 'Bank name cannot exceed 100 characters'],
    },
    monnifyContractCode: {
      type: String,
      trim: true,
    },
    donationCategories: [{
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'Category name cannot exceed 50 characters'],
      },
      description: {
        type: String,
        trim: true,
        maxlength: [200, 'Category description cannot exceed 200 characters'],
      },
      isActive: {
        type: Boolean,
        default: true,
      },
      defaultAmount: {
        type: Number,
        min: [0, 'Default amount cannot be negative'],
      },
    }],
  },
  stats: {
    totalMembers: {
      type: Number,
      default: 0,
      min: [0, 'Total members cannot be negative'],
    },
    totalVolunteers: {
      type: Number,
      default: 0,
      min: [0, 'Total volunteers cannot be negative'],
    },
    totalDonations: {
      type: Number,
      default: 0,
      min: [0, 'Total donations cannot be negative'],
    },
    totalExpenses: {
      type: Number,
      default: 0,
      min: [0, 'Total expenses cannot be negative'],
    },
    lastUpdated: {
      type: Date,
      default: Date.now,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for full address
churchSchema.virtual('fullAddress').get(function() {
  const { street, city, state, country, postalCode } = this.address;
  const parts = [street, city, state, country, postalCode].filter(Boolean);
  return parts.join(', ');
});

// Virtual for primary service
churchSchema.virtual('primaryService').get(function() {
  const sundayServices = this.services.filter(service => 
    service.day === 'sunday' && service.isActive
  );
  return sundayServices.length > 0 ? sundayServices[0] : null;
});

// Indexes for performance
churchSchema.index({ name: 1 });
churchSchema.index({ 'address.city': 1 });
churchSchema.index({ 'address.state': 1 });
churchSchema.index({ denomination: 1 });
churchSchema.index({ owner: 1 });
churchSchema.index({ isActive: 1 });
churchSchema.index({ 'services.day': 1 });

// Pre-save middleware to update stats
churchSchema.pre('save', async function(next) {
  if (this.isModified('stats')) {
    this.stats.lastUpdated = new Date();
  }
  next();
});

// Instance method to add donation category
churchSchema.methods.addDonationCategory = function(categoryData) {
  const existingCategory = this.financial.donationCategories.find(cat => 
    cat.name.toLowerCase() === categoryData.name.toLowerCase()
  );

  if (existingCategory) {
    Object.assign(existingCategory, categoryData);
  } else {
    this.financial.donationCategories.push(categoryData);
  }

  return this.save();
};

// Instance method to remove donation category
churchSchema.methods.removeDonationCategory = function(categoryName) {
  this.financial.donationCategories = this.financial.donationCategories.filter(cat => 
    cat.name.toLowerCase() !== categoryName.toLowerCase()
  );
  return this.save();
};

// Instance method to add service
churchSchema.methods.addService = function(serviceData) {
  const existingService = this.services.find(service => 
    service.name.toLowerCase() === serviceData.name.toLowerCase() && 
    service.day === serviceData.day
  );

  if (existingService) {
    Object.assign(existingService, serviceData);
  } else {
    this.services.push(serviceData);
  }

  return this.save();
};

// Instance method to remove service
churchSchema.methods.removeService = function(serviceName, day) {
  this.services = this.services.filter(service => 
    !(service.name.toLowerCase() === serviceName.toLowerCase() && service.day === day)
  );
  return this.save();
};

// Instance method to update stats
churchSchema.methods.updateStats = async function() {
  const Member = require('./Member');
  const Donation = require('./Donation');
  const Expense = require('./Expense');

  try {
    const [totalMembers, totalVolunteers, totalDonations, totalExpenses] = await Promise.all([
      Member.countDocuments({ churchId: this._id, isActive: true }),
      Member.countDocuments({ churchId: this._id, role: 'volunteer', isActive: true }),
      Donation.aggregate([
        { $match: { churchId: this._id, status: 'completed' } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ]),
      Expense.aggregate([
        { $match: { churchId: this._id } },
        { $group: { _id: null, total: { $sum: '$amount' } } }
      ])
    ]);

    this.stats = {
      totalMembers: totalMembers || 0,
      totalVolunteers: totalVolunteers || 0,
      totalDonations: totalDonations[0]?.total || 0,
      totalExpenses: totalExpenses[0]?.total || 0,
      lastUpdated: new Date(),
    };

    return this.save();
  } catch (error) {
    console.error('Error updating church stats:', error);
    throw error;
  }
};

// Static method to find churches by location
churchSchema.statics.findByLocation = function(city, state) {
  const query = {};
  
  if (city) query['address.city'] = new RegExp(city, 'i');
  if (state) query['address.state'] = new RegExp(state, 'i');
  
  return this.find({ ...query, isActive: true });
};

// Static method to find churches by denomination
churchSchema.statics.findByDenomination = function(denomination) {
  return this.find({ 
    denomination: new RegExp(denomination, 'i'), 
    isActive: true 
  });
};

// Static method to find active churches
churchSchema.statics.findActive = function() {
  return this.find({ isActive: true });
};

module.exports = mongoose.model('Church', churchSchema);
