const Member = require('../models/Member');
const User = require('../models/User');
const Church = require('../models/Church');
const VolunteerTeam = require('../models/VolunteerTeam');
const { sendChurchNotification, sendUserNotification } = require('../../config/pusher');
const emailService = require('../../config/email');

// @desc    Create a new member
// @route   POST /api/members
// @access  Private (Church Members)
const createMember = async (req, res) => {
  try {
    const { churchId, userId, firstName, lastName, dateOfBirth, gender, maritalStatus, address, emergencyContact, role, skills, interests } = req.body;

    // Check if church exists
    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Check if user exists (if userId provided)
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({
          success: false,
          error: { message: 'User not found' }
        });
      }
    }

    // Check if member already exists in this church
    const existingMember = await Member.findOne({ churchId, userId });
    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: { message: 'Member already exists in this church' }
      });
    }

    // Create member
    const member = await Member.create({
      churchId,
      userId,
      firstName,
      lastName,
      dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : undefined,
      gender,
      maritalStatus,
      address,
      emergencyContact,
      role: role || 'member',
      skills,
      interests
    });

    // Add user to church if userId provided
    if (userId) {
      const user = await User.findById(userId);
      user.addChurch(churchId, role || 'member');
      await user.save();
    }

    // Send real-time notification
    sendChurchNotification(churchId, 'member-joined', {
      memberId: member._id,
      memberName: member.fullName,
      role: member.role,
      addedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { member },
      message: 'Member added successfully'
    });
  } catch (error) {
    console.error('Create member error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add member' }
    });
  }
};

// @desc    Get all members (with filtering)
// @route   GET /api/members
// @access  Private (Church Members)
const getAllMembers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { churchId, role, isActive, firstTimer, search, gender, maritalStatus } = req.query;
    const filter = {};

    if (churchId) filter.churchId = churchId;
    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (firstTimer !== undefined) filter.firstTimer = firstTimer === 'true';
    if (gender) filter.gender = gender;
    if (maritalStatus) filter.maritalStatus = maritalStatus;

    // Text search
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const members = await Member.find(filter)
      .populate('churchId', 'name')
      .populate('userId', 'firstName lastName email')
      .populate('volunteerTeams.teamId', 'name category')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Member.countDocuments(filter);

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all members error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get members' }
    });
  }
};

// @desc    Get members by church
// @route   GET /api/members/church/:churchId
// @access  Private (Church Members)
const getMembersByChurch = async (req, res) => {
  try {
    const { churchId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { role, isActive, firstTimer, search } = req.query;
    const filter = { churchId };

    if (role) filter.role = role;
    if (isActive !== undefined) filter.isActive = isActive === 'true';
    if (firstTimer !== undefined) filter.firstTimer = firstTimer === 'true';

    // Text search
    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const members = await Member.find(filter)
      .populate('userId', 'firstName lastName email')
      .populate('volunteerTeams.teamId', 'name category')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Member.countDocuments(filter);

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get members by church error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get church members' }
    });
  }
};

// @desc    Get member by ID
// @route   GET /api/members/:id
// @access  Private (Church Members)
const getMemberById = async (req, res) => {
  try {
    const member = await Member.findById(req.params.id)
      .populate('churchId', 'name')
      .populate('userId', 'firstName lastName email')
      .populate('volunteerTeams.teamId', 'name category description')
      .populate('baptism.baptizedBy', 'firstName lastName');

    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    res.json({
      success: true,
      data: { member }
    });
  } catch (error) {
    console.error('Get member by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get member' }
    });
  }
};

// @desc    Update member
// @route   PUT /api/members/:id
// @access  Private (Church Members)
const updateMember = async (req, res) => {
  try {
    const { firstName, lastName, dateOfBirth, gender, maritalStatus, address, emergencyContact, role, skills, interests } = req.body;
    const memberId = req.params.id;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    // Update fields
    if (firstName) member.firstName = firstName;
    if (lastName) member.lastName = lastName;
    if (dateOfBirth) member.dateOfBirth = new Date(dateOfBirth);
    if (gender) member.gender = gender;
    if (maritalStatus) member.maritalStatus = maritalStatus;
    if (address) member.address = { ...member.address, ...address };
    if (emergencyContact) member.emergencyContact = { ...member.emergencyContact, ...emergencyContact };
    if (role) member.role = role;
    if (skills) member.skills = skills;
    if (interests) member.interests = interests;

    await member.save();

    // Update user's church role if role changed
    if (role && member.userId) {
      const user = await User.findById(member.userId);
      if (user) {
        user.updateChurchRole(member.churchId, role);
        await user.save();
      }
    }

    res.json({
      success: true,
      data: { member },
      message: 'Member updated successfully'
    });
  } catch (error) {
    console.error('Update member error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update member' }
    });
  }
};

// @desc    Delete member
// @route   DELETE /api/members/:id
// @access  Private (Church Admin)
const deleteMember = async (req, res) => {
  try {
    const memberId = req.params.id;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    // Remove user from church if userId exists
    if (member.userId) {
      const user = await User.findById(member.userId);
      if (user) {
        user.removeChurch(member.churchId);
        await user.save();
      }
    }

    await Member.findByIdAndDelete(memberId);

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete member' }
    });
  }
};

// @desc    Add attendance record
// @route   POST /api/members/:id/attendance
// @access  Private (Church Members)
const addAttendance = async (req, res) => {
  try {
    const { serviceType, serviceDate, status, notes } = req.body;
    const memberId = req.params.id;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    const attendanceData = {
      serviceType,
      serviceDate: new Date(serviceDate),
      status,
      notes,
      recordedBy: req.user.id
    };

    member.addAttendance(attendanceData);
    await member.save();

    res.status(201).json({
      success: true,
      data: { attendance: attendanceData },
      message: 'Attendance recorded successfully'
    });
  } catch (error) {
    console.error('Add attendance error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to record attendance' }
    });
  }
};

// @desc    Get attendance records
// @route   GET /api/members/:id/attendance
// @access  Private (Church Members)
const getAttendanceRecords = async (req, res) => {
  try {
    const { id } = req.params;
    const { startDate, endDate, serviceType } = req.query;

    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    let attendance = member.attendance;

    // Filter by date range
    if (startDate || endDate) {
      attendance = attendance.filter(record => {
        const recordDate = new Date(record.serviceDate);
        if (startDate && recordDate < new Date(startDate)) return false;
        if (endDate && recordDate > new Date(endDate)) return false;
        return true;
      });
    }

    // Filter by service type
    if (serviceType) {
      attendance = attendance.filter(record => record.serviceType === serviceType);
    }

    // Sort by date (newest first)
    attendance.sort((a, b) => new Date(b.serviceDate) - new Date(a.serviceDate));

    res.json({
      success: true,
      data: { attendance }
    });
  } catch (error) {
    console.error('Get attendance records error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get attendance records' }
    });
  }
};

// @desc    Update volunteer team role
// @route   PUT /api/members/:id/volunteer-teams/:teamId
// @access  Private (Church Admin)
const updateVolunteerTeamRole = async (req, res) => {
  try {
    const { memberId, teamId } = req.params;
    const { role, skills, availability } = req.body;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    // Update or add team membership
    const existingTeamIndex = member.volunteerTeams.findIndex(t => t.teamId.toString() === teamId);
    
    if (existingTeamIndex >= 0) {
      // Update existing team membership
      member.volunteerTeams[existingTeamIndex].role = role || member.volunteerTeams[existingTeamIndex].role;
      member.volunteerTeams[existingTeamIndex].skills = skills || member.volunteerTeams[existingTeamIndex].skills;
      member.volunteerTeams[existingTeamIndex].availability = availability || member.volunteerTeams[existingTeamIndex].availability;
    } else {
      // Add new team membership
      member.volunteerTeams.push({
        teamId,
        role: role || 'member',
        skills: skills || [],
        availability: availability || []
      });
    }

    await member.save();

    res.json({
      success: true,
      data: { member },
      message: 'Volunteer team role updated successfully'
    });
  } catch (error) {
    console.error('Update volunteer team role error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update volunteer team role' }
    });
  }
};

// @desc    Remove from volunteer team
// @route   DELETE /api/members/:id/volunteer-teams/:teamId
// @access  Private (Church Admin)
const removeFromVolunteerTeam = async (req, res) => {
  try {
    const { memberId, teamId } = req.params;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    // Remove team membership
    member.volunteerTeams = member.volunteerTeams.filter(t => t.teamId.toString() !== teamId);
    await member.save();

    res.json({
      success: true,
      message: 'Member removed from volunteer team successfully'
    });
  } catch (error) {
    console.error('Remove from volunteer team error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove member from volunteer team' }
    });
  }
};

// @desc    Update baptism details
// @route   PUT /api/members/:id/baptism
// @access  Private (Church Admin)
const updateBaptismDetails = async (req, res) => {
  try {
    const { baptized, baptismDate, baptismLocation, baptizedBy, baptismNotes } = req.body;
    const memberId = req.params.id;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    member.baptism = {
      baptized: baptized !== undefined ? baptized : member.baptism?.baptized || false,
      baptismDate: baptismDate ? new Date(baptismDate) : member.baptism?.baptismDate,
      baptismLocation: baptismLocation || member.baptism?.baptismLocation,
      baptizedBy: baptizedBy || member.baptism?.baptizedBy,
      baptismNotes: baptismNotes || member.baptism?.baptismNotes
    };

    await member.save();

    res.json({
      success: true,
      data: { member },
      message: 'Baptism details updated successfully'
    });
  } catch (error) {
    console.error('Update baptism details error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update baptism details' }
    });
  }
};

// @desc    Add note to member
// @route   POST /api/members/:id/notes
// @access  Private (Church Members)
const addNote = async (req, res) => {
  try {
    const { content, type } = req.body;
    const memberId = req.params.id;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    const note = {
      content,
      type: type || 'general',
      author: req.user.id,
      date: new Date()
    };

    member.notes.push(note);
    await member.save();

    res.status(201).json({
      success: true,
      data: { note },
      message: 'Note added successfully'
    });
  } catch (error) {
    console.error('Add note error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add note' }
    });
  }
};

// @desc    Update member skills
// @route   PUT /api/members/:id/skills
// @access  Private (Church Members)
const updateSkills = async (req, res) => {
  try {
    const { skills } = req.body;
    const memberId = req.params.id;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    member.skills = skills;
    await member.save();

    res.json({
      success: true,
      data: { skills: member.skills },
      message: 'Skills updated successfully'
    });
  } catch (error) {
    console.error('Update skills error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update skills' }
    });
  }
};

// @desc    Update member interests
// @route   PUT /api/members/:id/interests
// @access  Private (Church Members)
const updateInterests = async (req, res) => {
  try {
    const { interests } = req.body;
    const memberId = req.params.id;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    member.interests = interests;
    await member.save();

    res.json({
      success: true,
      data: { interests: member.interests },
      message: 'Interests updated successfully'
    });
  } catch (error) {
    console.error('Update interests error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update interests' }
    });
  }
};

// @desc    Get volunteer team members
// @route   GET /api/members/volunteer-teams/:teamId
// @access  Private (Church Members)
const getVolunteerTeamMembers = async (req, res) => {
  try {
    const { teamId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const members = await Member.find({
      'volunteerTeams.teamId': teamId
    })
      .populate('userId', 'firstName lastName email')
      .populate('churchId', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ 'volunteerTeams.role': 1, firstName: 1 });

    const total = await Member.countDocuments({
      'volunteerTeams.teamId': teamId
    });

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get volunteer team members error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get volunteer team members' }
    });
  }
};

// @desc    Get first timer members
// @route   GET /api/members/first-timers
// @access  Private (Church Members)
const getFirstTimerMembers = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { firstTimer: true };
    if (churchId) filter.churchId = churchId;

    const members = await Member.find(filter)
      .populate('userId', 'firstName lastName email')
      .populate('churchId', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Member.countDocuments(filter);

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get first timer members error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get first timer members' }
    });
  }
};

// @desc    Bulk import members
// @route   POST /api/members/bulk-import
// @access  Private (Church Admin)
const bulkImportMembers = async (req, res) => {
  try {
    const { churchId, members } = req.body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'Members array is required' }
      });
    }

    // Check if church exists
    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    const results = {
      success: [],
      errors: []
    };

    for (const memberData of members) {
      try {
        const member = await Member.create({
          churchId,
          ...memberData
        });
        results.success.push(member);
      } catch (error) {
        results.errors.push({
          data: memberData,
          error: error.message
        });
      }
    }

    res.status(201).json({
      success: true,
      data: { results },
      message: `Successfully imported ${results.success.length} members`
    });
  } catch (error) {
    console.error('Bulk import members error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to bulk import members' }
    });
  }
};

// @desc    Export members
// @route   GET /api/members/export
// @access  Private (Church Admin)
const exportMembers = async (req, res) => {
  try {
    const { churchId, format = 'csv' } = req.query;

    // In a real implementation, you would export members to the specified format
    // For now, we'll return a mock response
    console.log('Exporting members:', { churchId, format });

    res.json({
      success: true,
      message: 'Members exported successfully',
      data: { downloadUrl: '/exports/members.csv' }
    });
  } catch (error) {
    console.error('Export members error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to export members' }
    });
  }
};

// @desc    Deactivate member
// @route   PUT /api/members/:id/deactivate
// @access  Private (Church Admin)
const deactivateMember = async (req, res) => {
  try {
    const memberId = req.params.id;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    member.isActive = false;
    member.deactivatedAt = new Date();
    member.deactivatedBy = req.user.id;
    await member.save();

    res.json({
      success: true,
      message: 'Member deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate member error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to deactivate member' }
    });
  }
};

// @desc    Activate member
// @route   PUT /api/members/:id/activate
// @access  Private (Church Admin)
const activateMember = async (req, res) => {
  try {
    const memberId = req.params.id;

    const member = await Member.findById(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found' }
      });
    }

    member.isActive = true;
    member.deactivatedAt = undefined;
    member.deactivatedBy = undefined;
    await member.save();

    res.json({
      success: true,
      message: 'Member activated successfully'
    });
  } catch (error) {
    console.error('Activate member error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to activate member' }
    });
  }
};

// @desc    Get attendance statistics
// @route   GET /api/members/stats/attendance
// @access  Private (Church Members)
const getAttendanceStats = async (req, res) => {
  try {
    const { churchId, startDate, endDate } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;

    const stats = await Member.getAttendanceStats(filter.churchId, startDate, endDate);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get attendance statistics' }
    });
  }
};

module.exports = {
  createMember,
  getAllMembers,
  getMembersByChurch,
  getMemberById,
  updateMember,
  deleteMember,
  addAttendance,
  getAttendanceRecords,
  updateVolunteerTeamRole,
  removeFromVolunteerTeam,
  updateBaptismDetails,
  addNote,
  updateSkills,
  updateInterests,
  getVolunteerTeamMembers,
  getFirstTimerMembers,
  bulkImportMembers,
  exportMembers,
  deactivateMember,
  activateMember,
  getAttendanceStats
};
