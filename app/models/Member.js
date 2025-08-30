const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  churchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true,
  },
  memberId: {
    type: String,
    unique: true,
    required: true,
  },
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot exceed 50 characters'],
  },
  lastName: {
    type: String,
    required: [true, 'Last name is required'],
    trim: true,
    maxlength: [50, 'Last name cannot exceed 50 characters'],
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
  dateOfBirth: {
    type: Date,
  },
  gender: {
    type: String,
    enum: ['male', 'female'],
  },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed'],
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
    postalCode: {
      type: String,
      trim: true,
      maxlength: [10, 'Postal code cannot exceed 10 characters'],
    },
  },
  emergencyContact: {
    name: {
      type: String,
      trim: true,
      maxlength: [100, 'Emergency contact name cannot exceed 100 characters'],
    },
    relationship: {
      type: String,
      trim: true,
      maxlength: [50, 'Relationship cannot exceed 50 characters'],
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
  role: {
    type: String,
    enum: ['member', 'volunteer', 'leader'],
    default: 'member',
  },
  volunteerTeams: [{
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'VolunteerTeam',
    },
    role: {
      type: String,
      trim: true,
      maxlength: [50, 'Team role cannot exceed 50 characters'],
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  }],
  skills: [{
    type: String,
    trim: true,
    maxlength: [50, 'Skill name cannot exceed 50 characters'],
  }],
  interests: [{
    type: String,
    trim: true,
    maxlength: [50, 'Interest name cannot exceed 50 characters'],
  }],
  attendance: [{
    serviceDate: {
      type: Date,
      required: true,
    },
    serviceType: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Service type cannot exceed 50 characters'],
    },
    status: {
      type: String,
      enum: ['present', 'absent', 'late', 'excused'],
      default: 'present',
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [200, 'Notes cannot exceed 200 characters'],
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
  firstTimer: {
    isFirstTimer: {
      type: Boolean,
      default: false,
    },
    firstVisitDate: {
      type: Date,
    },
    followUpStatus: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'no-response'],
      default: 'pending',
    },
    followUpNotes: [{
      date: {
        type: Date,
        default: Date.now,
      },
      notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Follow-up notes cannot exceed 500 characters'],
      },
      nextAction: {
        type: String,
        trim: true,
        maxlength: [200, 'Next action cannot exceed 200 characters'],
      },
      recordedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    }],
  },
  baptism: {
    isBaptized: {
      type: Boolean,
      default: false,
    },
    baptismDate: {
      type: Date,
    },
    baptismLocation: {
      type: String,
      trim: true,
      maxlength: [200, 'Baptism location cannot exceed 200 characters'],
    },
  },
  membership: {
    joinDate: {
      type: Date,
      default: Date.now,
    },
    membershipType: {
      type: String,
      enum: ['regular', 'associate', 'visitor'],
      default: 'regular',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    deactivationReason: {
      type: String,
      trim: true,
      maxlength: [200, 'Deactivation reason cannot exceed 200 characters'],
    },
    deactivationDate: {
      type: Date,
    },
  },
  financial: {
    totalDonations: {
      type: Number,
      default: 0,
      min: [0, 'Total donations cannot be negative'],
    },
    lastDonationDate: {
      type: Date,
    },
    preferredDonationMethod: {
      type: String,
      enum: ['online', 'cash', 'bank-transfer', 'check'],
      default: 'online',
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
    category: {
      type: String,
      enum: ['general', 'pastoral', 'financial', 'attendance', 'other'],
      default: 'general',
    },
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  }],
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for full name
memberSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for display name
memberSchema.virtual('displayName').get(function() {
  return this.fullName;
});

// Virtual for age
memberSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

// Virtual for attendance percentage
memberSchema.virtual('attendancePercentage').get(function() {
  if (this.attendance.length === 0) return 0;
  
  const presentCount = this.attendance.filter(record => 
    record.status === 'present' || record.status === 'late'
  ).length;
  
  return Math.round((presentCount / this.attendance.length) * 100);
});

// Indexes for performance
memberSchema.index({ userId: 1 });
memberSchema.index({ churchId: 1 });
memberSchema.index({ memberId: 1 });
memberSchema.index({ email: 1 });
memberSchema.index({ phone: 1 });
memberSchema.index({ role: 1 });
memberSchema.index({ 'membership.isActive': 1 });
memberSchema.index({ 'firstTimer.isFirstTimer': 1 });
memberSchema.index({ 'attendance.serviceDate': 1 });

// Compound indexes
memberSchema.index({ churchId: 1, role: 1 });
memberSchema.index({ churchId: 1, 'membership.isActive': 1 });
memberSchema.index({ churchId: 1, 'attendance.serviceDate': 1 });

// Pre-save middleware to generate member ID
memberSchema.pre('save', async function(next) {
  if (this.isNew && !this.memberId) {
    const Church = require('./Church');
    const church = await Church.findById(this.churchId);
    
    if (church) {
      const memberCount = await this.constructor.countDocuments({ churchId: this.churchId });
      this.memberId = `${church.name.substring(0, 3).toUpperCase()}${String(memberCount + 1).padStart(4, '0')}`;
    }
  }
  next();
});

// Instance method to add attendance record
memberSchema.methods.addAttendance = function(attendanceData) {
  const existingRecord = this.attendance.find(record => 
    record.serviceDate.toDateString() === new Date(attendanceData.serviceDate).toDateString() &&
    record.serviceType === attendanceData.serviceType
  );

  if (existingRecord) {
    Object.assign(existingRecord, attendanceData);
  } else {
    this.attendance.push(attendanceData);
  }

  return this.save();
};

// Instance method to add volunteer team
memberSchema.methods.addVolunteerTeam = function(teamId, role) {
  const existingTeam = this.volunteerTeams.find(team => 
    team.teamId.toString() === teamId.toString()
  );

  if (existingTeam) {
    existingTeam.role = role;
    existingTeam.isActive = true;
  } else {
    this.volunteerTeams.push({
      teamId,
      role,
      joinedAt: new Date(),
      isActive: true,
    });
  }

  return this.save();
};

// Instance method to remove volunteer team
memberSchema.methods.removeVolunteerTeam = function(teamId) {
  const team = this.volunteerTeams.find(team => 
    team.teamId.toString() === teamId.toString()
  );
  
  if (team) {
    team.isActive = false;
  }

  return this.save();
};

// Instance method to add note
memberSchema.methods.addNote = function(noteData) {
  this.notes.push(noteData);
  return this.save();
};

// Instance method to add follow-up note
memberSchema.methods.addFollowUpNote = function(followUpData) {
  this.firstTimer.followUpNotes.push(followUpData);
  return this.save();
};

// Instance method to update first timer status
memberSchema.methods.updateFirstTimerStatus = function(status, notes = null) {
  this.firstTimer.followUpStatus = status;
  
  if (notes) {
    this.firstTimer.followUpNotes.push({
      date: new Date(),
      notes,
      recordedBy: this.recordedBy,
    });
  }

  return this.save();
};

// Static method to find members by church
memberSchema.statics.findByChurch = function(churchId, options = {}) {
  const query = { churchId };
  
  if (options.role) query.role = options.role;
  if (options.isActive !== undefined) query['membership.isActive'] = options.isActive;
  if (options.isFirstTimer !== undefined) query['firstTimer.isFirstTimer'] = options.isFirstTimer;
  
  return this.find(query);
};

// Static method to find active members
memberSchema.statics.findActive = function(churchId) {
  return this.find({ 
    churchId, 
    'membership.isActive': true 
  });
};

// Static method to find volunteers
memberSchema.statics.findVolunteers = function(churchId) {
  return this.find({ 
    churchId, 
    role: 'volunteer',
    'membership.isActive': true 
  });
};

// Static method to find first timers
memberSchema.statics.findFirstTimers = function(churchId) {
  return this.find({ 
    churchId, 
    'firstTimer.isFirstTimer': true,
    'membership.isActive': true 
  });
};

// Static method to get attendance statistics
memberSchema.statics.getAttendanceStats = async function(churchId, startDate, endDate) {
  const pipeline = [
    { $match: { churchId: mongoose.Types.ObjectId(churchId) } },
    { $unwind: '$attendance' },
    { $match: { 
      'attendance.serviceDate': { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      } 
    } },
    { $group: {
      _id: {
        date: { $dateToString: { format: '%Y-%m-%d', date: '$attendance.serviceDate' } },
        status: '$attendance.status'
      },
      count: { $sum: 1 }
    } },
    { $group: {
      _id: '$_id.date',
      statuses: {
        $push: {
          status: '$_id.status',
          count: '$count'
        }
      },
      total: { $sum: '$count' }
    } },
    { $sort: { _id: 1 } }
  ];

  return this.aggregate(pipeline);
};

module.exports = mongoose.model('Member', memberSchema);
