const Donation = require("../models/Donation");
const Member = require("../models/Member");
const Church = require("../models/Church");
const DonationCampaign = require("../models/DonationCampaign");
const monnifyService = require("../../config/monnify");
const {
  sendChurchNotification,
  sendUserNotification,
} = require("../../config/pusher");
const emailService = require("../../config/email");

// @desc    Create a new donation (manual entry)
// @route   POST /api/donations
// @access  Private (Church Members)
const createDonation = async (req, res) => {
  try {
    const {
      churchId,
      donorId,
      amount,
      currency,
      category,
      description,
      paymentMethod,
      donorInfo,
    } = req.body;

    // Check if church exists
    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: "Church not found" },
      });
    }

    // Check if donor exists (if member)
    if (donorId) {
      const donor = await Member.findById(donorId);
      if (!donor) {
        return res.status(404).json({
          success: false,
          error: { message: "Donor not found" },
        });
      }
    }

    // Create donation
    const donation = await Donation.create({
      churchId,
      donorId,
      amount,
      currency: currency || church.settings?.currency || "NGN",
      category,
      description,
      paymentMethod,
      donorInfo,
      status: "completed",
      paymentDetails: {
        method: paymentMethod,
        processedAt: new Date(),
        processedBy: req.user.id,
      },
    });

    // Send real-time notification
    sendChurchNotification(churchId, "donation-received", {
      donationId: donation._id,
      amount: donation.amount,
      category: donation.category,
      donorName: donation.donorInfo?.name || "Anonymous",
    });

    // Send confirmation email if donor info provided
    if (donorInfo?.email && donorInfo?.name) {
      try {
        await emailService.sendDonationConfirmation(
          donorInfo.email,
          donorInfo.name,
          donation.amount,
          church.name,
          donation.category
        );
      } catch (emailError) {
        console.error("Donation confirmation email error:", emailError);
      }
    }

    res.status(201).json({
      success: true,
      data: { donation },
      message: "Donation recorded successfully",
    });
  } catch (error) {
    console.error("Create donation error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to record donation" },
    });
  }
};

// @desc    Initialize online donation payment
// @route   POST /api/donations/online
// @access  Public
const initializeOnlineDonation = async (req, res) => {
  try {
    const {
      churchId,
      amount,
      currency,
      category,
      description,
      donorInfo,
      campaignId,
    } = req.body;

    // Check if church exists
    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: "Church not found" },
      });
    }

    // Check if campaign exists (if specified)
    if (campaignId) {
      const campaign = await DonationCampaign.findById(campaignId);
      if (!campaign || !campaign.isActive) {
        return res.status(400).json({
          success: false,
          error: { message: "Invalid or inactive campaign" },
        });
      }
    }

    // Generate transaction reference
    const transactionReference = `DON_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create donation record
    const donation = await Donation.create({
      churchId,
      amount,
      currency: currency || church.settings?.currency || "NGN",
      category,
      description,
      paymentMethod: "online",
      donorInfo,
      campaignId,
      status: "pending",
      transactionReference,
      paymentDetails: {
        method: "online",
        gateway: "monnify",
        transactionReference,
      },
    });

    // Initialize payment with Monnify
    const paymentData = {
      amount: donation.amount,
      customerName: donorInfo?.name || "Anonymous Donor",
      customerEmail: donorInfo?.email || "donor@church.com",
      paymentReference: transactionReference,
      paymentDescription: description || `Donation to ${church.name}`,
      currencyCode: donation.currency,
      contractCode:
        church.financial?.monnifyContractCode ||
        process.env.MONNIFY_CONTRACT_CODE,
      redirectUrl: `${process.env.FRONTEND_URL}/donation/success?reference=${transactionReference}`,
      paymentMethods: ["CARD", "ACCOUNT_TRANSFER", "USSD"],
    };

    const paymentResponse = await monnifyService.initializePayment(paymentData);

    if (paymentResponse.status === "SUCCESS") {
      // Update donation with payment details
      donation.paymentDetails.gatewayResponse = paymentResponse;
      donation.paymentDetails.checkoutUrl =
        paymentResponse.responseBody.checkoutUrl;
      await donation.save();

      res.json({
        success: true,
        data: {
          donation,
          checkoutUrl: paymentResponse.responseBody.checkoutUrl,
          transactionReference,
        },
        message: "Payment initialized successfully",
      });
    } else {
      // Payment initialization failed
      donation.status = "failed";
      donation.paymentDetails.gatewayResponse = paymentResponse;
      await donation.save();

      res.status(400).json({
        success: false,
        error: { message: "Failed to initialize payment" },
      });
    }
  } catch (error) {
    console.error("Initialize online donation error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to initialize payment" },
    });
  }
};

// @desc    Handle payment gateway callback
// @route   POST /api/donations/callback
// @access  Public
const handlePaymentCallback = async (req, res) => {
  try {
    const {
      paymentReference,
      transactionReference,
      paidAmount,
      transactionHash,
      transactionStatus,
      paymentMethod,
      paidOn,
      transactionType,
    } = req.body;

    // Verify signature
    const signature = req.headers["mfy-signature"];
    if (!monnifyService.handleWebhookCallback(req.body, signature)) {
      return res.status(400).json({
        success: false,
        error: { message: "Invalid signature" },
      });
    }

    // Find donation by transaction reference
    const donation = await Donation.findOne({ transactionReference });
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    // Update donation status
    if (transactionStatus === "SUCCESS") {
      donation.status = "completed";
      donation.paymentDetails.gatewayResponse = req.body;
      donation.paymentDetails.processedAt = new Date(paidOn);
      donation.paymentDetails.transactionHash = transactionHash;
      donation.paymentDetails.paymentMethod = paymentMethod;
      donation.paymentDetails.paidAmount = paidAmount;

      // Update campaign if applicable
      if (donation.campaignId) {
        const campaign = await DonationCampaign.findById(donation.campaignId);
        if (campaign) {
          campaign.addDonation(donation.amount, donation.donorId);
          await campaign.save();
        }
      }

      // Send real-time notification
      sendChurchNotification(donation.churchId, "donation-completed", {
        donationId: donation._id,
        amount: donation.amount,
        category: donation.category,
        donorName: donation.donorInfo?.name || "Anonymous",
      });

      // Send confirmation email
      if (donation.donorInfo?.email && donation.donorInfo?.name) {
        try {
          const church = await Church.findById(donation.churchId);
          await emailService.sendDonationConfirmation(
            donation.donorInfo.email,
            donation.donorInfo.name,
            donation.amount,
            church.name,
            donation.category
          );
        } catch (emailError) {
          console.error("Donation confirmation email error:", emailError);
        }
      }
    } else if (transactionStatus === "FAILED") {
      donation.status = "failed";
      donation.paymentDetails.gatewayResponse = req.body;
      donation.paymentDetails.failedAt = new Date();
    }

    await donation.save();

    res.json({
      success: true,
      message: "Callback processed successfully",
    });
  } catch (error) {
    console.error("Payment callback error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to process callback" },
    });
  }
};

// @desc    Get donations by church
// @route   GET /api/donations/church/:churchId
// @access  Private (Church Members)
const getDonationsByChurch = async (req, res) => {
  try {
    const { churchId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { category, status, paymentMethod, startDate, endDate, search } =
      req.query;
    const filter = { churchId };

    if (category) filter.category = category;
    if (status) filter.status = status;
    if (paymentMethod) filter["paymentDetails.method"] = paymentMethod;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Text search
    if (search) {
      filter.$or = [
        { "donorInfo.name": { $regex: search, $options: "i" } },
        { "donorInfo.email": { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const donations = await Donation.find(filter)
      .populate("donorId", "firstName lastName email")
      .populate("churchId", "name")
      .populate("campaignId", "name")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments(filter);

    res.json({
      success: true,
      data: {
        donations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get donations by church error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get donations" },
    });
  }
};

// @desc    Get all donations (with filtering)
// @route   GET /api/donations
// @access  Private (Church Members)
const getAllDonations = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const {
      churchId,
      status,
      category,
      paymentMethod,
      startDate,
      endDate,
      search,
    } = req.query;
    const filter = {};

    if (churchId) filter.churchId = churchId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (paymentMethod) filter.paymentMethod = paymentMethod;

    // Date range filter
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    // Text search
    if (search) {
      filter.$or = [
        { "donorInfo.name": { $regex: search, $options: "i" } },
        { "donorInfo.email": { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { category: { $regex: search, $options: "i" } },
      ];
    }

    const donations = await Donation.find(filter)
      .populate("churchId", "name")
      .populate("donorId", "firstName lastName")
      .populate("campaignId", "title")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments(filter);

    res.json({
      success: true,
      data: {
        donations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get all donations error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get donations" },
    });
  }
};

// @desc    Get donation by ID
// @route   GET /api/donations/:id
// @access  Private (Church Members)
const getDonationById = async (req, res) => {
  try {
    const donation = await Donation.findById(req.params.id)
      .populate("churchId", "name")
      .populate("donorId", "firstName lastName email phone")
      .populate("campaignId", "title description");

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    res.json({
      success: true,
      data: { donation },
    });
  } catch (error) {
    console.error("Get donation by ID error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get donation" },
    });
  }
};

// @desc    Update donation
// @route   PUT /api/donations/:id
// @access  Private (Church Members)
const updateDonation = async (req, res) => {
  try {
    const { description, category, donorInfo, notes } = req.body;
    const donationId = req.params.id;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    // Only allow updates to certain fields
    if (description) donation.description = description;
    if (category) donation.category = category;
    if (donorInfo) donation.donorInfo = { ...donation.donorInfo, ...donorInfo };
    if (notes) donation.notes = notes;

    await donation.save();

    res.json({
      success: true,
      data: { donation },
      message: "Donation updated successfully",
    });
  } catch (error) {
    console.error("Update donation error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to update donation" },
    });
  }
};

// @desc    Delete donation
// @route   DELETE /api/donations/:id
// @access  Private (Church Admin)
const deleteDonation = async (req, res) => {
  try {
    const donationId = req.params.id;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    // Only allow deletion of pending or failed donations
    if (donation.status === "completed") {
      return res.status(400).json({
        success: false,
        error: { message: "Cannot delete completed donations" },
      });
    }

    await Donation.findByIdAndDelete(donationId);

    res.json({
      success: true,
      message: "Donation deleted successfully",
    });
  } catch (error) {
    console.error("Delete donation error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to delete donation" },
    });
  }
};

// @desc    Verify donation
// @route   PUT /api/donations/:id/verify
// @access  Private (Church Admin)
const verifyDonation = async (req, res) => {
  try {
    const { verificationNotes } = req.body;
    const donationId = req.params.id;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    donation.verification = {
      verifiedBy: req.user.id,
      verifiedAt: new Date(),
      verificationNotes,
    };

    await donation.save();

    // Send real-time notification
    sendChurchNotification(donation.churchId, "donation-verified", {
      donationId: donation._id,
      amount: donation.amount,
      verifiedBy: req.user.id,
    });

    res.json({
      success: true,
      data: { donation },
      message: "Donation verified successfully",
    });
  } catch (error) {
    console.error("Verify donation error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to verify donation" },
    });
  }
};

// @desc    Generate receipt
// @route   POST /api/donations/:id/generate-receipt
// @access  Private (Church Members)
const generateReceipt = async (req, res) => {
  try {
    const donationId = req.params.id;

    const donation = await Donation.findById(donationId);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    // Generate receipt number if not exists
    if (!donation.receipt.number) {
      donation.generateReceipt();
      await donation.save();
    }

    res.json({
      success: true,
      data: { receipt: donation.receipt },
      message: "Receipt generated successfully",
    });
  } catch (error) {
    console.error("Generate receipt error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to generate receipt" },
    });
  }
};

// @desc    Get receipt
// @route   GET /api/donations/:id/receipt
// @access  Private (Church Members)
const getReceipt = async (req, res) => {
  try {
    const donationId = req.params.id;

    const donation = await Donation.findById(donationId)
      .populate("churchId", "name address contact")
      .populate("donorId", "firstName lastName email");

    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    if (!donation.receipt.number) {
      return res.status(400).json({
        success: false,
        error: { message: "Receipt not generated yet" },
      });
    }

    res.json({
      success: true,
      data: { receipt: donation.receipt },
    });
  } catch (error) {
    console.error("Get receipt error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get receipt" },
    });
  }
};

// @desc    Get donation statistics
// @route   GET /api/donations/stats/overview
// @access  Private (Church Members)
const getDonationStats = async (req, res) => {
  try {
    const { churchId, startDate, endDate } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const stats = await Donation.getDonationStats(
      filter.churchId,
      filter.createdAt?.$gte,
      filter.createdAt?.$lte
    );

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error("Get donation stats error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get donation statistics" },
    });
  }
};

// @desc    Get donations by category
// @route   GET /api/donations/stats/by-category
// @access  Private (Church Members)
const getDonationsByCategory = async (req, res) => {
  try {
    const { churchId, startDate, endDate } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    const stats = await Donation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: "$category",
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
          averageAmount: { $avg: "$amount" },
        },
      },
      { $sort: { totalAmount: -1 } },
    ]);

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error("Get donations by category error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get category statistics" },
    });
  }
};

// @desc    Get donations by date
// @route   GET /api/donations/stats/by-date
// @access  Private (Church Members)
const getDonationsByDate = async (req, res) => {
  try {
    const { churchId, startDate, endDate, groupBy = "day" } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;
    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    let dateFormat;
    if (groupBy === "month") {
      dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
    } else if (groupBy === "week") {
      dateFormat = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
    } else {
      dateFormat = {
        $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
      };
    }

    const stats = await Donation.aggregate([
      { $match: filter },
      {
        $group: {
          _id: dateFormat,
          totalAmount: { $sum: "$amount" },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json({
      success: true,
      data: { stats },
    });
  } catch (error) {
    console.error("Get donations by date error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get date statistics" },
    });
  }
};

// @desc    Get pending donations
// @route   GET /api/donations/pending
// @access  Private (Church Members)
const getPendingDonations = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: "pending" };
    if (churchId) filter.churchId = churchId;

    const donations = await Donation.find(filter)
      .populate("churchId", "name")
      .populate("donorId", "firstName lastName")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments(filter);

    res.json({
      success: true,
      data: {
        donations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get pending donations error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get pending donations" },
    });
  }
};

// @desc    Get completed donations
// @route   GET /api/donations/completed
// @access  Private (Church Members)
const getCompletedDonations = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: "completed" };
    if (churchId) filter.churchId = churchId;

    const donations = await Donation.find(filter)
      .populate("churchId", "name")
      .populate("donorId", "firstName lastName")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments(filter);

    res.json({
      success: true,
      data: {
        donations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get completed donations error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get completed donations" },
    });
  }
};

// @desc    Add tags to donation
// @route   POST /api/donations/:id/tags
// @access  Private (Church Admin)
const addTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    // Add new tags without duplicates
    tags.forEach((tag) => {
      if (!donation.tags.includes(tag)) {
        donation.tags.push(tag);
      }
    });

    await donation.save();

    res.status(201).json({
      success: true,
      data: { tags: donation.tags },
      message: "Tags added successfully",
    });
  } catch (error) {
    console.error("Add tags error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to add tags" },
    });
  }
};

// @desc    Remove tags from donation
// @route   DELETE /api/donations/:id/tags
// @access  Private (Church Admin)
const removeTags = async (req, res) => {
  try {
    const { id } = req.params;
    const { tags } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    // Remove specified tags
    donation.tags = donation.tags.filter((tag) => !tags.includes(tag));
    await donation.save();

    res.json({
      success: true,
      data: { tags: donation.tags },
      message: "Tags removed successfully",
    });
  } catch (error) {
    console.error("Remove tags error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to remove tags" },
    });
  }
};

// @desc    Add note to donation
// @route   POST /api/donations/:id/notes
// @access  Private (Church Members)
const addNote = async (req, res) => {
  try {
    const { id } = req.params;
    const { content, category } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    const note = {
      content,
      category: category || "general",
      author: req.user.id,
      date: new Date(),
    };

    donation.notes = donation.notes || [];
    donation.notes.push(note);
    await donation.save();

    res.status(201).json({
      success: true,
      data: { note },
      message: "Note added successfully",
    });
  } catch (error) {
    console.error("Add note error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to add note" },
    });
  }
};

// @desc    Get total donations for a church
// @route   GET /api/donations/totals/church/:churchId
// @access  Private (Church Members)
const getTotalDonations = async (req, res) => {
  try {
    const { churchId } = req.params;
    const { startDate, endDate, category } = req.query;

    const filter = { churchId, status: "completed" };

    if (startDate || endDate) {
      filter.createdAt = {};
      if (startDate) filter.createdAt.$gte = new Date(startDate);
      if (endDate) filter.createdAt.$lte = new Date(endDate);
    }

    if (category) filter.category = category;

    const totalAmount = await Donation.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]);

    const totalCount = await Donation.countDocuments(filter);

    res.json({
      success: true,
      data: {
        totalAmount: totalAmount[0]?.total || 0,
        totalCount,
        currency: "NGN",
      },
    });
  } catch (error) {
    console.error("Get total donations error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get total donations" },
    });
  }
};

// @desc    Bulk import donations
// @route   POST /api/donations/bulk-import
// @access  Private (Church Admin)
const bulkImportDonations = async (req, res) => {
  try {
    const { churchId, donations } = req.body;

    if (!donations || !Array.isArray(donations) || donations.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: "Donations array is required" },
      });
    }

    const results = {
      success: [],
      errors: [],
    };

    for (const donationData of donations) {
      try {
        const donation = await Donation.create({
          churchId,
          ...donationData,
          status: "completed",
        });
        results.success.push(donation);
      } catch (error) {
        results.errors.push({
          data: donationData,
          error: error.message,
        });
      }
    }

    res.status(201).json({
      success: true,
      data: { results },
      message: `Successfully imported ${results.success.length} donations`,
    });
  } catch (error) {
    console.error("Bulk import donations error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to bulk import donations" },
    });
  }
};

// @desc    Export donations
// @route   GET /api/donations/export
// @access  Private (Church Admin)
const exportDonations = async (req, res) => {
  try {
    const { churchId, format = "csv" } = req.query;

    // In a real implementation, you would export donations to the specified format
    // For now, we'll return a mock response
    console.log("Exporting donations:", { churchId, format });

    res.json({
      success: true,
      message: "Donations exported successfully",
      data: { downloadUrl: "/exports/donations.csv" },
    });
  } catch (error) {
    console.error("Export donations error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to export donations" },
    });
  }
};

// @desc    Process refund
// @route   POST /api/donations/:id/refund
// @access  Private (Church Admin)
const processRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason, amount } = req.body;

    const donation = await Donation.findById(id);
    if (!donation) {
      return res.status(404).json({
        success: false,
        error: { message: "Donation not found" },
      });
    }

    if (donation.status !== "completed") {
      return res.status(400).json({
        success: false,
        error: { message: "Only completed donations can be refunded" },
      });
    }

    const refundAmount = amount || donation.amount;
    if (refundAmount > donation.amount) {
      return res.status(400).json({
        success: false,
        error: { message: "Refund amount cannot exceed donation amount" },
      });
    }

    donation.status = "refunded";
    donation.refund = {
      amount: refundAmount,
      reason,
      processedAt: new Date(),
      processedBy: req.user.id,
    };

    await donation.save();

    res.json({
      success: true,
      data: { donation },
      message: "Refund processed successfully",
    });
  } catch (error) {
    console.error("Process refund error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to process refund" },
    });
  }
};

// @desc    Get failed donations
// @route   GET /api/donations/failed
// @access  Private (Church Members)
const getFailedDonations = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: "failed" };
    if (churchId) filter.churchId = churchId;

    const donations = await Donation.find(filter)
      .populate("churchId", "name")
      .populate("donorId", "firstName lastName")
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Donation.countDocuments(filter);

    res.json({
      success: true,
      data: {
        donations,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    console.error("Get failed donations error:", error);
    res.status(500).json({
      success: false,
      error: { message: "Failed to get failed donations" },
    });
  }
};

module.exports = {
  createDonation,
  initializeOnlineDonation,
  handlePaymentCallback,
  getAllDonations,
  getDonationsByChurch,
  getDonationById,
  updateDonation,
  deleteDonation,
  verifyDonation,
  generateReceipt,
  getReceipt,
  getDonationStats,
  getDonationsByCategory,
  getDonationsByDate,
  getPendingDonations,
  getCompletedDonations,
  getFailedDonations,
  addTags,
  removeTags,
  addNote,
  getTotalDonations,
  bulkImportDonations,
  exportDonations,
  processRefund,
};
