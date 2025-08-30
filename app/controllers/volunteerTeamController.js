const VolunteerTeam = require('../models/VolunteerTeam');
const Member = require('../models/Member');
const Church = require('../models/Church');
const { sendTeamNotification, sendChurchNotification } = require('../../config/pusher');

// @desc    Create a new volunteer team
// @route   POST /api/volunteer-teams
// @access  Private (Church Members)
const createVolunteerTeam = async (req, res) => {
  try {
    const { churchId, name, description, category, leader, requirements } = req.body;

    // Check if team name already exists in this church
    const existingTeam = await VolunteerTeam.findOne({ churchId, name });
    if (existingTeam) {
      return res.status(400).json({
        success: false,
        error: { message: 'Team name already exists in this church' }
      });
    }

    // Create team
    const team = await VolunteerTeam.create({
      churchId,
      name,
      description,
      category,
      leader,
      requirements
    });

    // Send real-time notification
    sendChurchNotification(churchId, 'team-created', {
      teamId: team._id,
      teamName: team.name,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { team },
      message: 'Volunteer team created successfully'
    });
  } catch (error) {
    console.error('Create volunteer team error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create volunteer team' }
    });
  }
};

// @desc    Get all volunteer teams (with filtering)
// @route   GET /api/volunteer-teams
// @access  Private (Church Members)
const getAllVolunteerTeams = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { churchId, category, isActive, search } = req.query;
    const filter = {};

    if (churchId) filter.churchId = churchId;
    if (category) filter.category = category;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    // Text search
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const teams = await VolunteerTeam.find(filter)
      .populate('leader.userId', 'firstName lastName email')
      .populate('churchId', 'name')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await VolunteerTeam.countDocuments(filter);

    res.json({
      success: true,
      data: {
        teams,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all volunteer teams error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get volunteer teams' }
    });
  }
};

// @desc    Get volunteer team by ID
// @route   GET /api/volunteer-teams/:id
// @access  Private (Church Members)
const getVolunteerTeamById = async (req, res) => {
  try {
    const team = await VolunteerTeam.findById(req.params.id)
      .populate('leader.userId', 'firstName lastName email phone')
      .populate('members.memberId', 'firstName lastName email phone')
      .populate('churchId', 'name');

    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    res.json({
      success: true,
      data: { team }
    });
  } catch (error) {
    console.error('Get volunteer team by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get volunteer team' }
    });
  }
};

// @desc    Update volunteer team
// @route   PUT /api/volunteer-teams/:id
// @access  Private (Church Admin)
const updateVolunteerTeam = async (req, res) => {
  try {
    const { name, description, category, requirements } = req.body;
    const teamId = req.params.id;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    // Update fields
    if (name) team.name = name;
    if (description) team.description = description;
    if (category) team.category = category;
    if (requirements) team.requirements = { ...team.requirements, ...requirements };

    await team.save();

    // Send real-time notification
    sendTeamNotification(teamId, 'team-updated', {
      teamId: team._id,
      teamName: team.name,
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      data: { team },
      message: 'Volunteer team updated successfully'
    });
  } catch (error) {
    console.error('Update volunteer team error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update volunteer team' }
    });
  }
};

// @desc    Delete volunteer team
// @route   DELETE /api/volunteer-teams/:id
// @access  Private (Church Admin)
const deleteVolunteerTeam = async (req, res) => {
  try {
    const teamId = req.params.id;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    // Remove team from all members
    await Member.updateMany(
      { 'volunteerTeams.teamId': teamId },
      { $pull: { volunteerTeams: { teamId } } }
    );

    await VolunteerTeam.findByIdAndDelete(teamId);

    // Send real-time notification
    sendChurchNotification(team.churchId, 'team-deleted', {
      teamId: team._id,
      teamName: team.name,
      deletedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Volunteer team deleted successfully'
    });
  } catch (error) {
    console.error('Delete volunteer team error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete volunteer team' }
    });
  }
};

// @desc    Add member to team
// @route   POST /api/volunteer-teams/:id/members
// @access  Private (Church Members)
const addMemberToTeam = async (req, res) => {
  try {
    const { memberId, role, skills, availability } = req.body;
    const teamId = req.params.id;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    // Check if member is already in the team
    const existingMember = team.members.find(m => m.memberId.toString() === memberId);
    if (existingMember) {
      return res.status(400).json({
        success: false,
        error: { message: 'Member is already in this team' }
      });
    }

    // Add member to team
    const memberData = {
      memberId,
      role,
      skills,
      availability,
      joinedAt: new Date()
    };

    team.addMember(memberData);
    await team.save();

    // Add team to member's volunteer teams
    const member = await Member.findById(memberId);
    if (member) {
      member.volunteerTeams.push({
        teamId,
        role,
        skills,
        availability,
        joinedAt: new Date()
      });
      await member.save();
    }

    // Send real-time notification
    sendTeamNotification(teamId, 'member-added', {
      teamId: team._id,
      teamName: team.name,
      memberId,
      role,
      addedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { member: memberData },
      message: 'Member added to team successfully'
    });
  } catch (error) {
    console.error('Add member to team error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add member to team' }
    });
  }
};

// @desc    Update member's role in team
// @route   PUT /api/volunteer-teams/:id/members/:memberId
// @access  Private (Church Members)
const updateMemberRole = async (req, res) => {
  try {
    const { role, skills, availability } = req.body;
    const { id: teamId, memberId } = req.params;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    // Update member in team
    const member = team.members.find(m => m.memberId.toString() === memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found in team' }
      });
    }

    if (role) member.role = role;
    if (skills) member.skills = skills;
    if (availability) member.availability = availability;

    await team.save();

    // Update member's volunteer team record
    await Member.updateOne(
      { _id: memberId, 'volunteerTeams.teamId': teamId },
      {
        $set: {
          'volunteerTeams.$.role': role || member.role,
          'volunteerTeams.$.skills': skills || member.skills,
          'volunteerTeams.$.availability': availability || member.availability
        }
      }
    );

    res.json({
      success: true,
      data: { member },
      message: 'Member role updated successfully'
    });
  } catch (error) {
    console.error('Update member role error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update member role' }
    });
  }
};

// @desc    Remove member from team
// @route   DELETE /api/volunteer-teams/:id/members/:memberId
// @access  Private (Church Members)
const removeMemberFromTeam = async (req, res) => {
  try {
    const { id: teamId, memberId } = req.params;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    // Remove member from team
    const member = team.members.find(m => m.memberId.toString() === memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        error: { message: 'Member not found in team' }
      });
    }

    team.removeMember(memberId);
    await team.save();

    // Remove team from member's volunteer teams
    await Member.updateOne(
      { _id: memberId },
      { $pull: { volunteerTeams: { teamId } } }
    );

    // Send real-time notification
    sendTeamNotification(teamId, 'member-removed', {
      teamId: team._id,
      teamName: team.name,
      memberId,
      removedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Member removed from team successfully'
    });
  } catch (error) {
    console.error('Remove member from team error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove member from team' }
    });
  }
};

// @desc    Add schedule to team
// @route   POST /api/volunteer-teams/:id/schedule
// @access  Private (Church Members)
const addSchedule = async (req, res) => {
  try {
    const { serviceType, day, time, description, requiredMembers } = req.body;
    const teamId = req.params.id;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    const schedule = {
      serviceType,
      day,
      time,
      description,
      requiredMembers,
      isActive: true
    };

    team.schedule.push(schedule);
    await team.save();

    // Send real-time notification
    sendTeamNotification(teamId, 'schedule-added', {
      teamId: team._id,
      teamName: team.name,
      serviceType,
      day,
      time,
      addedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { schedule },
      message: 'Schedule added successfully'
    });
  } catch (error) {
    console.error('Add schedule error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add schedule' }
    });
  }
};

// @desc    Update team schedule
// @route   PUT /api/volunteer-teams/:id/schedule/:scheduleId
// @access  Private (Church Members)
const updateSchedule = async (req, res) => {
  try {
    const { serviceType, day, time, description, requiredMembers, isActive } = req.body;
    const { id: teamId, scheduleId } = req.params;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    const schedule = team.schedule.id(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: { message: 'Schedule not found' }
      });
    }

    // Update fields
    if (serviceType) schedule.serviceType = serviceType;
    if (day) schedule.day = day;
    if (time) schedule.time = time;
    if (description) schedule.description = description;
    if (requiredMembers !== undefined) schedule.requiredMembers = requiredMembers;
    if (typeof isActive === 'boolean') schedule.isActive = isActive;

    await team.save();

    res.json({
      success: true,
      data: { schedule },
      message: 'Schedule updated successfully'
    });
  } catch (error) {
    console.error('Update schedule error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update schedule' }
    });
  }
};

// @desc    Remove team schedule
// @route   DELETE /api/volunteer-teams/:id/schedule/:scheduleId
// @access  Private (Church Members)
const removeSchedule = async (req, res) => {
  try {
    const { id: teamId, scheduleId } = req.params;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    const schedule = team.schedule.id(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: { message: 'Schedule not found' }
      });
    }

    team.schedule.pull(scheduleId);
    await team.save();

    res.json({
      success: true,
      message: 'Schedule removed successfully'
    });
  } catch (error) {
    console.error('Remove schedule error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove schedule' }
    });
  }
};

// @desc    Assign member to schedule
// @route   POST /api/volunteer-teams/:id/schedule/:scheduleId/assign
// @access  Private (Church Members)
const assignMemberToSchedule = async (req, res) => {
  try {
    const { memberId, role } = req.body;
    const { id: teamId, scheduleId } = req.params;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    const schedule = team.schedule.id(scheduleId);
    if (!schedule) {
      return res.status(404).json({
        success: false,
        error: { message: 'Schedule not found' }
      });
    }

    // Check if member is already assigned
    const existingAssignment = schedule.assignments.find(a => a.memberId.toString() === memberId);
    if (existingAssignment) {
      return res.status(400).json({
        success: false,
        error: { message: 'Member is already assigned to this schedule' }
      });
    }

    const assignment = {
      memberId,
      role,
      assignedAt: new Date(),
      assignedBy: req.user.id
    };

    schedule.assignments.push(assignment);
    await team.save();

    res.status(201).json({
      success: true,
      data: { assignment },
      message: 'Member assigned to schedule successfully'
    });
  } catch (error) {
    console.error('Assign member to schedule error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to assign member to schedule' }
    });
  }
};

// @desc    Update team leader
// @route   PUT /api/volunteer-teams/:id/leader
// @access  Private (Church Admin)
const updateTeamLeader = async (req, res) => {
  try {
    const { userId, name, email, phone } = req.body;
    const teamId = req.params.id;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    team.leader = { userId, name, email, phone };
    await team.save();

    // Send real-time notification
    sendTeamNotification(teamId, 'leader-updated', {
      teamId: team._id,
      teamName: team.name,
      newLeader: { userId, name },
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      data: { leader: team.leader },
      message: 'Team leader updated successfully'
    });
  } catch (error) {
    console.error('Update team leader error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update team leader' }
    });
  }
};

// @desc    Update team requirements
// @route   PUT /api/volunteer-teams/:id/requirements
// @access  Private (Church Admin)
const updateTeamRequirements = async (req, res) => {
  try {
    const { minMembers, skills, training, age } = req.body;
    const teamId = req.params.id;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    // Update requirements
    if (minMembers !== undefined) team.requirements.minMembers = minMembers;
    if (skills) team.requirements.skills = skills;
    if (training) team.requirements.training = training;
    if (age) team.requirements.age = age;

    await team.save();

    res.json({
      success: true,
      data: { requirements: team.requirements },
      message: 'Team requirements updated successfully'
    });
  } catch (error) {
    console.error('Update team requirements error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update team requirements' }
    });
  }
};

// @desc    Get available members for team
// @route   GET /api/volunteer-teams/:id/available-members
// @access  Private (Church Members)
const getAvailableMembers = async (req, res) => {
  try {
    const teamId = req.params.id;
    const { skills, availability } = req.query;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    const filter = { churchId: team.churchId, isActive: true };

    // Filter by skills if specified
    if (skills) {
      filter.skills = { $in: skills.split(',') };
    }

    const members = await Member.find(filter)
      .populate('userId', 'firstName lastName email phone')
      .select('-attendance -notes');

    // Filter by availability if specified
    let availableMembers = members;
    if (availability) {
      availableMembers = members.filter(member => {
        const memberTeam = member.volunteerTeams.find(t => t.teamId.toString() === teamId);
        return !memberTeam || memberTeam.availability.includes(availability);
      });
    }

    res.json({
      success: true,
      data: { members: availableMembers }
    });
  } catch (error) {
    console.error('Get available members error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get available members' }
    });
  }
};

// @desc    Evaluate team performance
// @route   POST /api/volunteer-teams/:id/evaluate
// @access  Private (Church Admin)
const evaluateTeamPerformance = async (req, res) => {
  try {
    const { rating, feedback, areas } = req.body;
    const teamId = req.params.id;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    const evaluation = {
      rating,
      feedback,
      areas,
      evaluatedBy: req.user.id,
      evaluatedAt: new Date()
    };

    team.performance.evaluations.push(evaluation);
    await team.save();

    res.status(201).json({
      success: true,
      data: { evaluation },
      message: 'Team performance evaluated successfully'
    });
  } catch (error) {
    console.error('Evaluate team performance error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to evaluate team performance' }
    });
  }
};

// @desc    Get teams by category
// @route   GET /api/volunteer-teams/category/:category
// @access  Private (Church Members)
const getTeamsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { churchId } = req.query;

    const filter = { category };
    if (churchId) filter.churchId = churchId;

    const teams = await VolunteerTeam.find(filter)
      .populate('leader.userId', 'firstName lastName')
      .populate('churchId', 'name')
      .sort({ name: 1 });

    res.json({
      success: true,
      data: { teams }
    });
  } catch (error) {
    console.error('Get teams by category error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get teams by category' }
    });
  }
};

// @desc    Get upcoming schedules
// @route   GET /api/volunteer-teams/:id/upcoming-schedules
// @access  Private (Church Members)
const getUpcomingSchedules = async (req, res) => {
  try {
    const teamId = req.params.id;
    const { days = 7 } = req.query;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    const upcomingSchedules = team.getUpcomingSchedules(parseInt(days));

    res.json({
      success: true,
      data: { schedules: upcomingSchedules }
    });
  } catch (error) {
    console.error('Get upcoming schedules error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get upcoming schedules' }
    });
  }
};

// @desc    Get today's schedules
// @route   GET /api/volunteer-teams/:id/today-schedules
// @access  Private (Church Members)
const getTodaySchedules = async (req, res) => {
  try {
    const teamId = req.params.id;

    const team = await VolunteerTeam.findById(teamId);
    if (!team) {
      return res.status(404).json({
        success: false,
        error: { message: 'Volunteer team not found' }
      });
    }

    const todaySchedules = team.getTodaySchedules();

    res.json({
      success: true,
      data: { schedules: todaySchedules }
    });
  } catch (error) {
    console.error('Get today schedules error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get today schedules' }
    });
  }
};

module.exports = {
  createVolunteerTeam,
  getAllVolunteerTeams,
  getVolunteerTeamById,
  updateVolunteerTeam,
  deleteVolunteerTeam,
  addMemberToTeam,
  updateMemberRole,
  removeMemberFromTeam,
  addSchedule,
  updateSchedule,
  removeSchedule,
  assignMemberToSchedule,
  updateTeamLeader,
  updateTeamRequirements,
  getAvailableMembers,
  evaluateTeamPerformance,
  getTeamsByCategory,
  getUpcomingSchedules,
  getTodaySchedules
};