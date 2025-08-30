const DonationCampaign = require('../models/DonationCampaign');
const Church = require('../models/Church');
const { sendChurchNotification, sendUserNotification } = require('../../config/pusher');
const emailService = require('../../config/email');

// @desc    Create a new donation campaign
// @route   POST /api/campaigns
// @access  Private (Church Admin)
const createCampaign = async (req, res) => {
  try {
    const { churchId, title, description, category, targetAmount, startDate, endDate, images, video, socialSharing, donorWall, settings } = req.body;

    // Check if church exists
    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Create campaign
    const campaign = await DonationCampaign.create({
      churchId,
      title,
      description,
      category,
      targetAmount,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      images,
      video,
      socialSharing,
      donorWall,
      settings,
      status: 'pending',
      createdBy: req.user.id
    });

    // Send real-time notification
    sendChurchNotification(churchId, 'campaign-created', {
      campaignId: campaign._id,
      title: campaign.title,
      targetAmount: campaign.targetAmount,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { campaign },
      message: 'Campaign created successfully'
    });
  } catch (error) {
    console.error('Create campaign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create campaign' }
    });
  }
};

// @desc    Get all campaigns (with filtering)
// @route   GET /api/campaigns
// @access  Public
const getAllCampaigns = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { churchId, category, status, featured, urgent, search } = req.query;
    const filter = {};

    if (churchId) filter.churchId = churchId;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (featured === 'true') filter.isFeatured = true;
    if (urgent === 'true') filter.isUrgent = true;

    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const campaigns = await DonationCampaign.find(filter)
      .populate('churchId', 'name logo')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await DonationCampaign.countDocuments(filter);

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
    console.error('Get all campaigns error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get campaigns' }
    });
  }
};

// @desc    Search campaigns
// @route   GET /api/campaigns/search
// @access  Public
const searchCampaigns = async (req, res) => {
  try {
    const { q, churchId, category, status, featured, urgent } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = {};

    // Text search
    if (q) {
      filter.$or = [
        { title: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
        { category: { $regex: q, $options: 'i' } }
      ];
    }

    // Specific filters
    if (churchId) filter.churchId = churchId;
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (featured === 'true') filter.isFeatured = true;
    if (urgent === 'true') filter.isUrgent = true;

    const campaigns = await DonationCampaign.find(filter)
      .populate('churchId', 'name logo')
      .populate('createdBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await DonationCampaign.countDocuments(filter);

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
    console.error('Search campaigns error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to search campaigns' }
    });
  }
};

// @desc    Get campaign by ID
// @route   GET /api/campaigns/:id
// @access  Public
const getCampaignById = async (req, res) => {
  try {
    const campaign = await DonationCampaign.findById(req.params.id)
      .populate('churchId', 'name logo banner address contact')
      .populate('createdBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Increment view count
    campaign.incrementViewCount();
    await campaign.save();

    res.json({
      success: true,
      data: { campaign }
    });
  } catch (error) {
    console.error('Get campaign by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get campaign' }
    });
  }
};

// @desc    Update campaign
// @route   PUT /api/campaigns/:id
// @access  Private (Church Admin)
const updateCampaign = async (req, res) => {
  try {
    const { title, description, category, targetAmount, startDate, endDate, images, video, socialSharing, donorWall, settings } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Only allow updates to pending campaigns
    if (campaign.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot update active or completed campaigns' }
      });
    }

    // Update fields
    if (title) campaign.title = title;
    if (description) campaign.description = description;
    if (category) campaign.category = category;
    if (targetAmount) campaign.targetAmount = targetAmount;
    if (startDate) campaign.startDate = new Date(startDate);
    if (endDate) campaign.endDate = new Date(endDate);
    if (images) campaign.images = images;
    if (video) campaign.video = video;
    if (socialSharing) campaign.socialSharing = { ...campaign.socialSharing, ...socialSharing };
    if (donorWall) campaign.donorWall = { ...campaign.donorWall, ...donorWall };
    if (settings) campaign.settings = { ...campaign.settings, ...settings };

    campaign.lastModifiedBy = req.user.id;
    campaign.lastModifiedAt = new Date();

    await campaign.save();

    // Send real-time notification
    sendChurchNotification(campaign.churchId, 'campaign-updated', {
      campaignId: campaign._id,
      title: campaign.title,
      updatedBy: req.user.id
    });

    res.json({
      success: true,
      data: { campaign },
      message: 'Campaign updated successfully'
    });
  } catch (error) {
    console.error('Update campaign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update campaign' }
    });
  }
};

// @desc    Delete campaign
// @route   DELETE /api/campaigns/:id
// @access  Private (Church Admin)
const deleteCampaign = async (req, res) => {
  try {
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Only allow deletion of pending campaigns
    if (campaign.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete active or completed campaigns' }
      });
    }

    await DonationCampaign.findByIdAndDelete(campaignId);

    // Send real-time notification
    sendChurchNotification(campaign.churchId, 'campaign-deleted', {
      campaignId: campaign._id,
      title: campaign.title,
      deletedBy: req.user.id
    });

    res.json({
      success: true,
      message: 'Campaign deleted successfully'
    });
  } catch (error) {
    console.error('Delete campaign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete campaign' }
    });
  }
};

// @desc    Approve campaign
// @route   PUT /api/campaigns/:id/approve
// @access  Private (Church Admin)
const approveCampaign = async (req, res) => {
  try {
    const { notes } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    if (campaign.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign is not pending approval' }
      });
    }

    campaign.approve(req.user.id, notes);
    await campaign.save();

    // Send real-time notification
    sendChurchNotification(campaign.churchId, 'campaign-approved', {
      campaignId: campaign._id,
      title: campaign.title,
      approvedBy: req.user.id
    });

    res.json({
      success: true,
      data: { campaign },
      message: 'Campaign approved successfully'
    });
  } catch (error) {
    console.error('Approve campaign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to approve campaign' }
    });
  }
};

// @desc    Pause campaign
// @route   PUT /api/campaigns/:id/pause
// @access  Private (Church Admin)
const pauseCampaign = async (req, res) => {
  try {
    const { reason } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    if (campaign.status !== 'active') {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign is not active' }
      });
    }

    campaign.pause(req.user.id, reason);
    await campaign.save();

    // Send real-time notification
    sendChurchNotification(campaign.churchId, 'campaign-paused', {
      campaignId: campaign._id,
      title: campaign.title,
      pausedBy: req.user.id,
      reason
    });

    res.json({
      success: true,
      data: { campaign },
      message: 'Campaign paused successfully'
    });
  } catch (error) {
    console.error('Pause campaign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to pause campaign' }
    });
  }
};

// @desc    Resume campaign
// @route   PUT /api/campaigns/:id/resume
// @access  Private (Church Admin)
const resumeCampaign = async (req, res) => {
  try {
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    if (campaign.status !== 'paused') {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign is not paused' }
      });
    }

    campaign.resume(req.user.id);
    await campaign.save();

    // Send real-time notification
    sendChurchNotification(campaign.churchId, 'campaign-resumed', {
      campaignId: campaign._id,
      title: campaign.title,
      resumedBy: req.user.id
    });

    res.json({
      success: true,
      data: { campaign },
      message: 'Campaign resumed successfully'
    });
  } catch (error) {
    console.error('Resume campaign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to resume campaign' }
    });
  }
};

// @desc    Cancel campaign
// @route   PUT /api/campaigns/:id/cancel
// @access  Private (Church Admin)
const cancelCampaign = async (req, res) => {
  try {
    const { reason } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    if (campaign.status === 'completed' || campaign.status === 'cancelled') {
      return res.status(400).json({
        success: false,
        error: { message: 'Campaign cannot be cancelled' }
      });
    }

    campaign.cancel(req.user.id, reason);
    await campaign.save();

    // Send real-time notification
    sendChurchNotification(campaign.churchId, 'campaign-cancelled', {
      campaignId: campaign._id,
      title: campaign.title,
      cancelledBy: req.user.id,
      reason
    });

    res.json({
      success: true,
      data: { campaign },
      message: 'Campaign cancelled successfully'
    });
  } catch (error) {
    console.error('Cancel campaign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to cancel campaign' }
    });
  }
};

// @desc    Add image to campaign
// @route   POST /api/campaigns/:id/images
// @access  Private (Church Admin)
const addImage = async (req, res) => {
  try {
    const { filename, originalName, mimetype, size, url, caption, isPrimary } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    const image = {
      filename,
      originalName,
      mimetype,
      size,
      url,
      caption,
      isPrimary: isPrimary || false,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    };

    // If this is primary image, unset others
    if (isPrimary) {
      campaign.images.forEach(img => img.isPrimary = false);
    }

    campaign.images.push(image);
    await campaign.save();

    res.status(201).json({
      success: true,
      data: { image },
      message: 'Image added successfully'
    });
  } catch (error) {
    console.error('Add image error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add image' }
    });
  }
};

// @desc    Remove image from campaign
// @route   DELETE /api/campaigns/:id/images/:imageId
// @access  Private (Church Admin)
const removeImage = async (req, res) => {
  try {
    const { id: campaignId, imageId } = req.params;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    const image = campaign.images.id(imageId);
    if (!image) {
      return res.status(404).json({
        success: false,
        error: { message: 'Image not found' }
      });
    }

    campaign.images.pull(imageId);
    await campaign.save();

    res.json({
      success: true,
      message: 'Image removed successfully'
    });
  } catch (error) {
    console.error('Remove image error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove image' }
    });
  }
};

// @desc    Add video to campaign
// @route   POST /api/campaigns/:id/videos
// @access  Private (Church Admin)
const addVideo = async (req, res) => {
  try {
    const { filename, originalName, mimetype, size, url, thumbnail, duration, caption } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    const video = {
      filename,
      originalName,
      mimetype,
      size,
      url,
      thumbnail,
      duration,
      caption,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    };

    campaign.video = video;
    await campaign.save();

    res.status(201).json({
      success: true,
      data: { video },
      message: 'Video added successfully'
    });
  } catch (error) {
    console.error('Add video error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add video' }
    });
  }
};

// @desc    Remove video from campaign
// @route   DELETE /api/campaigns/:id/videos
// @access  Private (Church Admin)
const removeVideo = async (req, res) => {
  try {
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    campaign.video = undefined;
    await campaign.save();

    res.json({
      success: true,
      message: 'Video removed successfully'
    });
  } catch (error) {
    console.error('Remove video error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove video' }
    });
  }
};

// @desc    Add update to campaign
// @route   POST /api/campaigns/:id/updates
// @access  Private (Church Admin)
const addUpdate = async (req, res) => {
  try {
    const { title, content, isPublic } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    const update = {
      title,
      content,
      isPublic: isPublic !== undefined ? isPublic : true,
      date: new Date(),
      author: req.user.id
    };

    campaign.updates.push(update);
    await campaign.save();

    // Send real-time notification if public
    if (update.isPublic) {
      sendChurchNotification(campaign.churchId, 'campaign-update', {
        campaignId: campaign._id,
        title: campaign.title,
        updateTitle: update.title,
        updatedBy: req.user.id
      });
    }

    res.status(201).json({
      success: true,
      data: { update },
      message: 'Update added successfully'
    });
  } catch (error) {
    console.error('Add update error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add update' }
    });
  }
};

// @desc    Add milestone to campaign
// @route   POST /api/campaigns/:id/milestones
// @access  Private (Church Admin)
const addMilestone = async (req, res) => {
  try {
    const { title, description, targetAmount, reward } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    const milestone = {
      title,
      description,
      targetAmount,
      reward,
      date: new Date(),
      addedBy: req.user.id
    };

    campaign.milestones.push(milestone);
    await campaign.save();

    res.status(201).json({
      success: true,
      data: { milestone },
      message: 'Milestone added successfully'
    });
  } catch (error) {
    console.error('Add milestone error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add milestone' }
    });
  }
};

// @desc    Update social sharing settings
// @route   PUT /api/campaigns/:id/social-sharing
// @access  Private (Church Admin)
const updateSocialSharing = async (req, res) => {
  try {
    const { enabled, platforms, customMessage, autoShare } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Update social sharing settings
    if (enabled !== undefined) campaign.socialSharing.enabled = enabled;
    if (platforms) campaign.socialSharing.platforms = platforms;
    if (customMessage) campaign.socialSharing.customMessage = customMessage;
    if (autoShare !== undefined) campaign.socialSharing.autoShare = autoShare;

    await campaign.save();

    res.json({
      success: true,
      data: { socialSharing: campaign.socialSharing },
      message: 'Social sharing settings updated successfully'
    });
  } catch (error) {
    console.error('Update social sharing error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update social sharing settings' }
    });
  }
};

// @desc    Update donor wall settings
// @route   PUT /api/campaigns/:id/donor-wall
// @access  Private (Church Admin)
const updateDonorWall = async (req, res) => {
  try {
    const { enabled, showAmounts, showAnonymous, customMessage } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Update donor wall settings
    if (enabled !== undefined) campaign.donorWall.enabled = enabled;
    if (showAmounts !== undefined) campaign.donorWall.showAmounts = showAmounts;
    if (showAnonymous !== undefined) campaign.donorWall.showAnonymous = showAnonymous;
    if (customMessage) campaign.donorWall.customMessage = customMessage;

    await campaign.save();

    res.json({
      success: true,
      data: { donorWall: campaign.donorWall },
      message: 'Donor wall settings updated successfully'
    });
  } catch (error) {
    console.error('Update donor wall error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update donor wall settings' }
    });
  }
};

// @desc    Update campaign settings
// @route   PUT /api/campaigns/:id/settings
// @access  Private (Church Admin)
const updateSettings = async (req, res) => {
  try {
    const { anonymous, recurring, minAmount, maxAmount, autoClose, comments } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Update settings
    if (anonymous !== undefined) campaign.settings.anonymous = anonymous;
    if (recurring !== undefined) campaign.settings.recurring = recurring;
    if (minAmount !== undefined) campaign.settings.minAmount = minAmount;
    if (maxAmount !== undefined) campaign.settings.maxAmount = maxAmount;
    if (autoClose !== undefined) campaign.settings.autoClose = autoClose;
    if (comments !== undefined) campaign.settings.comments = comments;

    await campaign.save();

    res.json({
      success: true,
      data: { settings: campaign.settings },
      message: 'Campaign settings updated successfully'
    });
  } catch (error) {
    console.error('Update settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update campaign settings' }
    });
  }
};

// @desc    Increment share count
// @route   POST /api/campaigns/:id/share
// @access  Public
const incrementShareCount = async (req, res) => {
  try {
    const { platform } = req.body;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    // Increment share count for specific platform
    if (platform && campaign.socialSharing.platforms[platform]) {
      campaign.socialSharing.platforms[platform].shares += 1;
    }

    // Increment total shares
    campaign.analytics.totalShares += 1;

    await campaign.save();

    res.json({
      success: true,
      message: 'Share count incremented successfully'
    });
  } catch (error) {
    console.error('Increment share count error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to increment share count' }
    });
  }
};

// @desc    Get featured campaigns
// @route   GET /api/campaigns/featured
// @access  Public
const getFeaturedCampaigns = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const campaigns = await DonationCampaign.find({ isFeatured: true, status: 'active' })
      .populate('churchId', 'name logo')
      .populate('createdBy', 'firstName lastName')
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: { campaigns }
    });
  } catch (error) {
    console.error('Get featured campaigns error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get featured campaigns' }
    });
  }
};

// @desc    Get urgent campaigns
// @route   GET /api/campaigns/urgent
// @access  Public
const getUrgentCampaigns = async (req, res) => {
  try {
    const { limit = 5 } = req.query;

    const campaigns = await DonationCampaign.find({ isUrgent: true, status: 'active' })
      .populate('churchId', 'name logo')
      .populate('createdBy', 'firstName lastName')
      .limit(parseInt(limit))
      .sort({ endDate: 1 });

    res.json({
      success: true,
      data: { campaigns }
    });
  } catch (error) {
    console.error('Get urgent campaigns error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get urgent campaigns' }
    });
  }
};

// @desc    Get campaigns by category
// @route   GET /api/campaigns/category/:category
// @access  Public
const getCampaignsByCategory = async (req, res) => {
  try {
    const { category } = req.params;
    const { churchId, status } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { category };
    if (churchId) filter.churchId = churchId;
    if (status) filter.status = status;

    const campaigns = await DonationCampaign.find(filter)
      .populate('churchId', 'name logo')
      .populate('createdBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await DonationCampaign.countDocuments(filter);

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
    console.error('Get campaigns by category error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get campaigns by category' }
    });
  }
};

// @desc    Get campaign statistics
// @route   GET /api/campaigns/:id/stats
// @access  Private (Church Members)
const getCampaignStats = async (req, res) => {
  try {
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId);
    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    const stats = await DonationCampaign.getCampaignStats(campaignId);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get campaign stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get campaign statistics' }
    });
  }
};

// @desc    Export campaign
// @route   GET /api/campaigns/:id/export
// @access  Private (Church Members)
const exportCampaign = async (req, res) => {
  try {
    const { format = 'json' } = req.query;
    const campaignId = req.params.id;

    const campaign = await DonationCampaign.findById(campaignId)
      .populate('churchId', 'name')
      .populate('createdBy', 'firstName lastName');

    if (!campaign) {
      return res.status(404).json({
        success: false,
        error: { message: 'Campaign not found' }
      });
    }

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = [{
        'Campaign ID': campaign._id,
        'Title': campaign.title,
        'Description': campaign.description,
        'Category': campaign.category,
        'Target Amount': campaign.targetAmount,
        'Current Amount': campaign.currentAmount,
        'Progress': `${campaign.progressPercentage}%`,
        'Start Date': campaign.startDate,
        'End Date': campaign.endDate,
        'Status': campaign.status,
        'Featured': campaign.isFeatured ? 'Yes' : 'No',
        'Urgent': campaign.isUrgent ? 'Yes' : 'No',
        'Total Donors': campaign.analytics.totalDonors,
        'Total Donations': campaign.analytics.totalDonations,
        'Page Views': campaign.analytics.pageViews,
        'Total Shares': campaign.analytics.totalShares,
        'Created By': `${campaign.createdBy?.firstName} ${campaign.createdBy?.lastName}`,
        'Created At': campaign.createdAt
      }];

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=campaign-${campaign._id}.csv`);
      
      // Convert to CSV string
      const csvString = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).map(value => `"${value}"`).join(','))
      ].join('\n');

      res.send(csvString);
    } else {
      res.json({
        success: true,
        data: { campaign }
      });
    }
  } catch (error) {
    console.error('Export campaign error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to export campaign' }
    });
  }
};

module.exports = {
  createCampaign,
  getAllCampaigns,
  searchCampaigns,
  getCampaignById,
  updateCampaign,
  deleteCampaign,
  approveCampaign,
  pauseCampaign,
  resumeCampaign,
  cancelCampaign,
  addImage,
  removeImage,
  addVideo,
  removeVideo,
  addUpdate,
  addMilestone,
  updateSocialSharing,
  updateDonorWall,
  updateSettings,
  incrementShareCount,
  getFeaturedCampaigns,
  getUrgentCampaigns,
  getCampaignsByCategory,
  getCampaignStats,
  exportCampaign
};
