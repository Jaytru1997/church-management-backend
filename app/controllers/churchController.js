const Church = require('../models/Church');
const User = require('../models/User');
const { sendChurchNotification } = require('../../config/pusher');
const emailService = require('../../config/email');

// @desc    Create a new church
// @route   POST /api/churches
// @access  Private
const createChurch = async (req, res) => {
  try {
    const { name, description, address, contact, denomination, pastor, settings } = req.body;
    const userId = req.user.id;

    // Create church
    const church = await Church.create({
      name,
      description,
      address,
      contact,
      denomination,
      pastor,
      settings,
      owner: userId
    });

    // Add user to church as admin
    const user = await User.findById(userId);
    user.addChurch(church._id, 'admin');
    await user.save();

    // Send real-time notification
    sendChurchNotification(church._id, 'church-created', {
      churchId: church._id,
      churchName: church.name,
      ownerId: userId
    });

    res.status(201).json({
      success: true,
      data: { church },
      message: 'Church created successfully'
    });
  } catch (error) {
    console.error('Create church error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create church' }
    });
  }
};

// @desc    Get all churches (with optional filtering)
// @route   GET /api/churches
// @access  Public
const getAllChurches = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { denomination, state, city, isActive } = req.query;
    const filter = {};

    if (denomination) filter.denomination = denomination;
    if (state) filter['address.state'] = state;
    if (city) filter['address.city'] = city;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const churches = await Church.find(filter)
      .select('-financial -settings')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Church.countDocuments(filter);

    res.json({
      success: true,
      data: {
        churches,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all churches error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get churches' }
    });
  }
};

// @desc    Search churches by location, denomination, etc.
// @route   GET /api/churches/search
// @access  Public
const searchChurches = async (req, res) => {
  try {
    const { q, denomination, state, city, isActive } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // Text search
    if (q) {
      filter.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { 'address.city': { $regex: q, $options: 'i' } },
        { 'address.state': { $regex: q, $options: 'i' } }
      ];
    }

    // Specific filters
    if (denomination) filter.denomination = denomination;
    if (state) filter['address.state'] = state;
    if (city) filter['address.city'] = city;
    if (isActive !== undefined) filter.isActive = isActive === 'true';

    const churches = await Church.find(filter)
      .select('-financial -settings')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Church.countDocuments(filter);

    res.json({
      success: true,
      data: {
        churches,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Search churches error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to search churches' }
    });
  }
};

// @desc    Get church by ID
// @route   GET /api/churches/:id
// @access  Public
const getChurchById = async (req, res) => {
  try {
    const church = await Church.findById(req.params.id)
      .populate('owner', 'firstName lastName email')
      .populate('pastor', 'firstName lastName email phone');

    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    res.json({
      success: true,
      data: { church }
    });
  } catch (error) {
    console.error('Get church by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get church' }
    });
  }
};

// @desc    Update church
// @route   PUT /api/churches/:id
// @access  Private (Church Admin)
const updateChurch = async (req, res) => {
  try {
    const { name, description, address, contact, denomination, pastor } = req.body;
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Update fields
    if (name) church.name = name;
    if (description) church.description = description;
    if (address) church.address = { ...church.address, ...address };
    if (contact) church.contact = { ...church.contact, ...contact };
    if (denomination) church.denomination = denomination;
    if (pastor) church.pastor = { ...church.pastor, ...pastor };

    await church.save();

    // Send real-time notification
    sendChurchNotification(churchId, 'church-updated', {
      churchId,
      churchName: church.name,
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      data: { church },
      message: 'Church updated successfully'
    });
  } catch (error) {
    console.error('Update church error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update church' }
    });
  }
};

// @desc    Delete church
// @route   DELETE /api/churches/:id
// @access  Private (Church Admin)
const deleteChurch = async (req, res) => {
  try {
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Check if user is church owner
    if (church.owner.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: { message: 'Only church owner can delete church' }
      });
    }

    // Remove church from all users
    await User.updateMany(
      { 'churches.churchId': churchId },
      { $pull: { churches: { churchId } } }
    );

    await Church.findByIdAndDelete(churchId);

    // Send real-time notification
    sendChurchNotification(churchId, 'church-deleted', {
      churchId,
      churchName: church.name,
      deletedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Church deleted successfully'
    });
  } catch (error) {
    console.error('Delete church error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete church' }
    });
  }
};

// @desc    Add a new service to church
// @route   POST /api/churches/:id/services
// @access  Private (Church Admin)
const addService = async (req, res) => {
  try {
    const { name, day, time, description } = req.body;
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    const service = {
      name,
      day,
      time,
      description,
      isActive: true
    };

    church.services.push(service);
    await church.save();

    // Send real-time notification
    sendChurchNotification(churchId, 'service-added', {
      churchId,
      serviceName: name,
      addedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { service },
      message: 'Service added successfully'
    });
  } catch (error) {
    console.error('Add service error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add service' }
    });
  }
};

// @desc    Update a church service
// @route   PUT /api/churches/:id/services/:serviceId
// @access  Private (Church Admin)
const updateService = async (req, res) => {
  try {
    const { name, day, time, description, isActive } = req.body;
    const { id: churchId, serviceId } = req.params;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    const service = church.services.id(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: { message: 'Service not found' }
      });
    }

    // Update fields
    if (name) service.name = name;
    if (day) service.day = day;
    if (time) service.time = time;
    if (description) service.description = description;
    if (typeof isActive === 'boolean') service.isActive = isActive;

    await church.save();

    // Send real-time notification
    sendChurchNotification(churchId, 'service-updated', {
      churchId,
      serviceId,
      serviceName: service.name,
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      data: { service },
      message: 'Service updated successfully'
    });
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update service' }
    });
  }
};

// @desc    Remove a church service
// @route   DELETE /api/churches/:id/services/:serviceId
// @access  Private (Church Admin)
const removeService = async (req, res) => {
  try {
    const { id: churchId, serviceId } = req.params;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    const service = church.services.id(serviceId);
    if (!service) {
      return res.status(404).json({
        success: false,
        error: { message: 'Service not found' }
      });
    }

    const serviceName = service.name;
    church.services.pull(serviceId);
    await church.save();

    // Send real-time notification
    sendChurchNotification(churchId, 'service-removed', {
      churchId,
      serviceId,
      serviceName,
      removedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Service removed successfully'
    });
  } catch (error) {
    console.error('Remove service error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove service' }
    });
  }
};

// @desc    Add a new donation category
// @route   POST /api/churches/:id/donation-categories
// @access  Private (Church Admin)
const addDonationCategory = async (req, res) => {
  try {
    const { name, description, defaultAmount } = req.body;
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    const category = {
      name,
      description,
      defaultAmount,
      isActive: true
    };

    church.donationCategories.push(category);
    await church.save();

    res.status(201).json({
      success: true,
      data: { category },
      message: 'Donation category added successfully'
    });
  } catch (error) {
    console.error('Add donation category error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add donation category' }
    });
  }
};

// @desc    Update a donation category
// @route   PUT /api/churches/:id/donation-categories/:categoryId
// @access  Private (Church Admin)
const updateDonationCategory = async (req, res) => {
  try {
    const { name, description, defaultAmount, isActive } = req.body;
    const { id: churchId, categoryId } = req.params;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    const category = church.donationCategories.id(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found' }
      });
    }

    // Update fields
    if (name) category.name = name;
    if (description) category.description = description;
    if (defaultAmount !== undefined) category.defaultAmount = defaultAmount;
    if (typeof isActive === 'boolean') category.isActive = isActive;

    await church.save();

    res.json({
      success: true,
      data: { category },
      message: 'Donation category updated successfully'
    });
  } catch (error) {
    console.error('Update donation category error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update donation category' }
    });
  }
};

// @desc    Remove a donation category
// @route   DELETE /api/churches/:id/donation-categories/:categoryId
// @access  Private (Church Admin)
const removeDonationCategory = async (req, res) => {
  try {
    const { id: churchId, categoryId } = req.params;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    const category = church.donationCategories.id(categoryId);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found' }
      });
    }

    church.donationCategories.pull(categoryId);
    await church.save();

    res.json({
      success: true,
      message: 'Donation category removed successfully'
    });
  } catch (error) {
    console.error('Remove donation category error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove donation category' }
    });
  }
};

// @desc    Update church settings
// @route   PUT /api/churches/:id/settings
// @access  Private (Church Admin)
const updateSettings = async (req, res) => {
  try {
    const { currency, timezone, language, notifications, privacy } = req.body;
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Update settings
    if (currency) church.settings.currency = currency;
    if (timezone) church.settings.timezone = timezone;
    if (language) church.settings.language = language;
    if (notifications) {
      church.settings.notifications = {
        ...church.settings.notifications,
        ...notifications
      };
    }
    if (privacy) {
      church.settings.privacy = {
        ...church.settings.privacy,
        ...privacy
      };
    }

    await church.save();

    res.json({
      success: true,
      data: { settings: church.settings },
      message: 'Settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update settings' }
    });
  }
};

// @desc    Update church financial information
// @route   PUT /api/churches/:id/financial
// @access  Private (Church Admin)
const updateFinancialInfo = async (req, res) => {
  try {
    const { accountNumber, bankName, monnifyContractCode } = req.body;
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Update financial info
    if (accountNumber) church.financial.accountNumber = accountNumber;
    if (bankName) church.financial.bankName = bankName;
    if (monnifyContractCode) church.financial.monnifyContractCode = monnifyContractCode;

    await church.save();

    res.json({
      success: true,
      data: { financial: church.financial },
      message: 'Financial information updated successfully'
    });
  } catch (error) {
    console.error('Update financial info error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update financial information' }
    });
  }
};

// @desc    Get church statistics
// @route   GET /api/churches/:id/stats
// @access  Private (Church Members)
const getChurchStats = async (req, res) => {
  try {
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Get stats from church model
    const stats = await church.updateStats();

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get church stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get church statistics' }
    });
  }
};

// @desc    Update church statistics
// @route   POST /api/churches/:id/stats/update
// @access  Private (Church Admin)
const updateChurchStats = async (req, res) => {
  try {
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Update stats
    const stats = await church.updateStats();

    res.json({
      success: true,
      data: { stats },
      message: 'Statistics updated successfully'
    });
  } catch (error) {
    console.error('Update church stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update statistics' }
    });
  }
};

// @desc    Get church members
// @route   GET /api/churches/:id/members
// @access  Private (Church Members)
const getChurchMembers = async (req, res) => {
  try {
    const churchId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const User = require('../models/User');
    const members = await User.find({ 'churches.churchId': churchId })
      .select('firstName lastName email phone profilePicture')
      .skip(skip)
      .limit(limit)
      .sort({ 'churches.joinedAt': -1 });

    const total = await User.countDocuments({ 'churches.churchId': churchId });

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
    console.error('Get church members error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get church members' }
    });
  }
};

// @desc    Get church volunteer teams
// @route   GET /api/churches/:id/volunteer-teams
// @access  Private (Church Members)
const getChurchVolunteerTeams = async (req, res) => {
  try {
    const churchId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const VolunteerTeam = require('../models/VolunteerTeam');
    const teams = await VolunteerTeam.find({ churchId })
      .populate('leader.userId', 'firstName lastName email')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await VolunteerTeam.countDocuments({ churchId });

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
    console.error('Get church volunteer teams error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get volunteer teams' }
    });
  }
};

// @desc    Get church donations
// @route   GET /api/churches/:id/donations
// @access  Private (Church Members)
const getChurchDonations = async (req, res) => {
  try {
    const churchId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const Donation = require('../models/Donation');
    const donations = await Donation.find({ churchId })
      .populate('donorId', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments({ churchId });

    res.json({
      success: true,
      data: {
        donations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get church donations error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get donations' }
    });
  }
};

// @desc    Get church expenses
// @route   GET /api/churches/:id/expenses
// @access  Private (Church Members)
const getChurchExpenses = async (req, res) => {
  try {
    const churchId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const Expense = require('../models/Expense');
    const expenses = await Expense.find({ churchId })
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Expense.countDocuments({ churchId });

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get church expenses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get expenses' }
    });
  }
};

// @desc    Get church donation campaigns
// @route   GET /api/churches/:id/campaigns
// @access  Private (Church Members)
const getChurchCampaigns = async (req, res) => {
  try {
    const churchId = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const DonationCampaign = require('../models/DonationCampaign');
    const campaigns = await DonationCampaign.find({ churchId })
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await DonationCampaign.countDocuments({ churchId });

    res.json({
      success: true,
      data: {
        campaigns,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get church campaigns error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get campaigns' }
    });
  }
};

// @desc    Upload church logo
// @route   POST /api/churches/:id/upload-logo
// @access  Private (Church Admin)
const uploadLogo = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { filename, originalName, mimetype, size, url } = req.body;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Remove old logo if exists
    if (church.logo) {
      // In production, delete old file from storage
    }

    church.logo = {
      filename,
      originalName,
      mimetype,
      size,
      url,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    };

    await church.save();

    res.json({
      success: true,
      data: { logo: church.logo },
      message: 'Logo uploaded successfully'
    });
  } catch (error) {
    console.error('Upload logo error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to upload logo' }
    });
  }
};

// @desc    Upload church banner
// @route   POST /api/churches/:id/upload-banner
// @access  Private (Church Admin)
const uploadBanner = async (req, res) => {
  try {
    const churchId = req.params.id;
    const { filename, originalName, mimetype, size, url } = req.body;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Remove old banner if exists
    if (church.banner) {
      // In production, delete old file from storage
    }

    church.banner = {
      filename,
      originalName,
      mimetype,
      size,
      url,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    };

    await church.save();

    res.json({
      success: true,
      data: { banner: church.banner },
      message: 'Banner uploaded successfully'
    });
  } catch (error) {
    console.error('Upload banner error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to upload banner' }
    });
  }
};

// @desc    Remove church logo
// @route   DELETE /api/churches/:id/logo
// @access  Private (Church Admin)
const removeLogo = async (req, res) => {
  try {
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    if (!church.logo) {
      return res.status(400).json({
        success: false,
        error: { message: 'No logo to remove' }
      });
    }

    // In production, delete file from storage
    church.logo = undefined;
    await church.save();

    res.json({
      success: true,
      message: 'Logo removed successfully'
    });
  } catch (error) {
    console.error('Remove logo error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove logo' }
    });
  }
};

// @desc    Remove church banner
// @route   DELETE /api/churches/:id/banner
// @access  Private (Church Admin)
const removeBanner = async (req, res) => {
  try {
    const churchId = req.params.id;

    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    if (!church.banner) {
      return res.status(400).json({
        success: false,
        error: { message: 'No banner to remove' }
      });
    }

    // In production, delete file from storage
    church.banner = undefined;
    await church.save();

    res.json({
      success: true,
      message: 'Banner removed successfully'
    });
  } catch (error) {
    console.error('Remove banner error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove banner' }
    });
  }
};

module.exports = {
  createChurch,
  getAllChurches,
  searchChurches,
  getChurchById,
  updateChurch,
  deleteChurch,
  addService,
  updateService,
  removeService,
  addDonationCategory,
  updateDonationCategory,
  removeDonationCategory,
  updateSettings,
  updateFinancialInfo,
  getChurchStats,
  updateChurchStats,
  getChurchMembers,
  getChurchVolunteerTeams,
  getChurchDonations,
  getChurchExpenses,
  getChurchCampaigns,
  uploadLogo,
  uploadBanner,
  removeLogo,
  removeBanner
};
