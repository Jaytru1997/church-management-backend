const mongoose = require('mongoose');

const volunteerTeamSchema = new mongoose.Schema({
  churchId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Church',
    required: true,
  },
  name: {
    type: String,
    required: [true, 'Team name is required'],
    trim: true,
    maxlength: [100, 'Team name cannot exceed 100 characters'],
  },
  description: {
    type: String,
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters'],
  },
  category: {
    type: String,
    enum: ['worship', 'ushering', 'technical', 'children', 'youth', 'outreach', 'administration', 'maintenance', 'other'],
    required: [true, 'Team category is required'],
  },
  leader: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Team leader is required'],
    },
    name: {
      type: String,
      required: [true, 'Leader name is required'],
      trim: true,
      maxlength: [100, 'Leader name cannot exceed 100 characters'],
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
  members: [{
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: [100, 'Member name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      required: true,
      trim: true,
      maxlength: [50, 'Role cannot exceed 50 characters'],
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    skills: [{
      type: String,
      trim: true,
      maxlength: [50, 'Skill name cannot exceed 50 characters'],
    }],
    availability: [{
      day: {
        type: String,
        enum: ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'],
        required: true,
      },
      timeSlots: [{
        startTime: {
          type: String,
          required: true,
          trim: true,
        },
        endTime: {
          type: String,
          required: true,
          trim: true,
        },
      }],
    }],
  }],
  schedule: [{
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
    startTime: {
      type: String,
      required: true,
      trim: true,
    },
    endTime: {
      type: String,
      required: true,
      trim: true,
    },
    requiredMembers: {
      type: Number,
      required: true,
      min: [1, 'Required members must be at least 1'],
    },
    assignedMembers: [{
      memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
      },
      name: {
        type: String,
        required: true,
        trim: true,
        maxlength: [100, 'Member name cannot exceed 100 characters'],
      },
      role: {
        type: String,
        required: true,
        trim: true,
        maxlength: [50, 'Role cannot exceed 50 characters'],
      },
      status: {
        type: String,
        enum: ['assigned', 'confirmed', 'declined', 'completed'],
        default: 'assigned',
      },
      notes: {
        type: String,
        trim: true,
        maxlength: [200, 'Notes cannot exceed 200 characters'],
      },
    }],
    notes: {
      type: String,
      trim: true,
      maxlength: [500, 'Schedule notes cannot exceed 500 characters'],
    },
  }],
  requirements: {
    minimumMembers: {
      type: Number,
      default: 1,
      min: [1, 'Minimum members must be at least 1'],
    },
    skills: [{
      type: String,
      trim: true,
      maxlength: [50, 'Skill name cannot exceed 50 characters'],
    }],
    trainingRequired: {
      type: Boolean,
      default: false,
    },
    trainingDescription: {
      type: String,
      trim: true,
      maxlength: [500, 'Training description cannot exceed 500 characters'],
    },
    ageRequirement: {
      min: {
        type: Number,
        min: [0, 'Minimum age cannot be negative'],
      },
      max: {
        type: Number,
        min: [0, 'Maximum age cannot be negative'],
      },
    },
  },
  performance: {
    totalServices: {
      type: Number,
      default: 0,
      min: [0, 'Total services cannot be negative'],
    },
    averageAttendance: {
      type: Number,
      default: 0,
      min: [0, 'Average attendance cannot be negative'],
    },
    memberSatisfaction: {
      type: Number,
      default: 0,
      min: [0, 'Member satisfaction cannot be negative'],
      max: [5, 'Member satisfaction cannot exceed 5'],
    },
    lastEvaluated: {
      type: Date,
      default: Date.now,
    },
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

// Virtual for active member count
volunteerTeamSchema.virtual('activeMemberCount').get(function() {
  return this.members.filter(member => member.isActive).length;
});

// Virtual for upcoming schedules
volunteerTeamSchema.virtual('upcomingSchedules').get(function() {
  const now = new Date();
  return this.schedule.filter(schedule => 
    new Date(schedule.serviceDate) > now
  ).sort((a, b) => new Date(a.serviceDate) - new Date(b.serviceDate));
});

// Virtual for today's schedules
volunteerTeamSchema.virtual('todaySchedules').get(function() {
  const today = new Date();
  const todayString = today.toDateString();
  return this.schedule.filter(schedule => 
    new Date(schedule.serviceDate).toDateString() === todayString
  );
});

// Indexes for performance
volunteerTeamSchema.index({ churchId: 1 });
volunteerTeamSchema.index({ name: 1 });
volunteerTeamSchema.index({ category: 1 });
volunteerTeamSchema.index({ 'leader.userId': 1 });
volunteerTeamSchema.index({ isActive: 1 });
volunteerTeamSchema.index({ 'schedule.serviceDate': 1 });

// Compound indexes
volunteerTeamSchema.index({ churchId: 1, category: 1 });
volunteerTeamSchema.index({ churchId: 1, isActive: 1 });
volunteerTeamSchema.index({ churchId: 1, 'schedule.serviceDate': 1 });

// Pre-save middleware to update performance stats
volunteerTeamSchema.pre('save', async function(next) {
  if (this.isModified('schedule')) {
    this.performance.totalServices = this.schedule.length;
    
    if (this.schedule.length > 0) {
      const totalAttendance = this.schedule.reduce((sum, schedule) => {
        return sum + schedule.assignedMembers.filter(member => 
          member.status === 'completed'
        ).length;
      }, 0);
      
      this.performance.averageAttendance = Math.round(totalAttendance / this.schedule.length);
    }
    
    this.performance.lastEvaluated = new Date();
  }
  next();
});

// Instance method to add member
volunteerTeamSchema.methods.addMember = function(memberData) {
  const existingMember = this.members.find(member => 
    member.memberId.toString() === memberData.memberId.toString()
  );

  if (existingMember) {
    Object.assign(existingMember, memberData);
    existingMember.isActive = true;
  } else {
    this.members.push({
      ...memberData,
      joinedAt: new Date(),
      isActive: true,
    });
  }

  return this.save();
};

// Instance method to remove member
volunteerTeamSchema.methods.removeMember = function(memberId) {
  const member = this.members.find(member => 
    member.memberId.toString() === memberId.toString()
  );
  
  if (member) {
    member.isActive = false;
  }

  return this.save();
};

// Instance method to add schedule
volunteerTeamSchema.methods.addSchedule = function(scheduleData) {
  this.schedule.push(scheduleData);
  return this.save();
};

// Instance method to update schedule
volunteerTeamSchema.methods.updateSchedule = function(scheduleId, updateData) {
  const schedule = this.schedule.id(scheduleId);
  if (schedule) {
    Object.assign(schedule, updateData);
  }
  return this.save();
};

// Instance method to assign member to schedule
volunteerTeamSchema.methods.assignMemberToSchedule = function(scheduleId, memberData) {
  const schedule = this.schedule.id(scheduleId);
  if (schedule) {
    const existingAssignment = schedule.assignedMembers.find(assignment => 
      assignment.memberId.toString() === memberData.memberId.toString()
    );

    if (existingAssignment) {
      Object.assign(existingAssignment, memberData);
    } else {
      schedule.assignedMembers.push(memberData);
    }
  }
  return this.save();
};

// Instance method to remove member from schedule
volunteerTeamSchema.methods.removeMemberFromSchedule = function(scheduleId, memberId) {
  const schedule = this.schedule.id(scheduleId);
  if (schedule) {
    schedule.assignedMembers = schedule.assignedMembers.filter(assignment => 
      assignment.memberId.toString() !== memberId.toString()
    );
  }
  return this.save();
};

// Instance method to get available members for a schedule
volunteerTeamSchema.methods.getAvailableMembers = function(scheduleDate, serviceType) {
  const scheduleDay = new Date(scheduleDate).toLocaleDateString('en-US', { weekday: 'lowercase' });
  
  return this.members.filter(member => {
    if (!member.isActive) return false;
    
    const availability = member.availability.find(avail => avail.day === scheduleDay);
    if (!availability) return false;
    
    // Check if member has required skills
    if (this.requirements.skills.length > 0) {
      const hasRequiredSkills = this.requirements.skills.some(skill => 
        member.skills.includes(skill)
      );
      if (!hasRequiredSkills) return false;
    }
    
    return true;
  });
};

// Instance method to evaluate performance
volunteerTeamSchema.methods.evaluatePerformance = function() {
  if (this.schedule.length === 0) return this.performance;

  const completedSchedules = this.schedule.filter(schedule => 
    schedule.assignedMembers.some(member => member.status === 'completed')
  );

  if (completedSchedules.length > 0) {
    const totalAttendance = completedSchedules.reduce((sum, schedule) => {
      return sum + schedule.assignedMembers.filter(member => 
        member.status === 'completed'
      ).length;
    }, 0);

    this.performance.totalServices = completedSchedules.length;
    this.performance.averageAttendance = Math.round(totalAttendance / completedSchedules.length);
    this.performance.lastEvaluated = new Date();
  }

  return this.performance;
};

// Static method to find teams by church
volunteerTeamSchema.statics.findByChurch = function(churchId, options = {}) {
  const query = { churchId };
  
  if (options.category) query.category = options.category;
  if (options.isActive !== undefined) query.isActive = options.isActive;
  
  return this.find(query);
};

// Static method to find active teams
volunteerTeamSchema.statics.findActive = function(churchId) {
  return this.find({ churchId, isActive: true });
};

// Static method to find teams by category
volunteerTeamSchema.statics.findByCategory = function(churchId, category) {
  return this.find({ churchId, category, isActive: true });
};

// Static method to find teams with upcoming schedules
volunteerTeamSchema.statics.findWithUpcomingSchedules = function(churchId, days = 7) {
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + days);
  
  return this.find({
    churchId,
    isActive: true,
    'schedule.serviceDate': { $gte: new Date(), $lte: futureDate }
  });
};

module.exports = mongoose.model('VolunteerTeam', volunteerTeamSchema);
