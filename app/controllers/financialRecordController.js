const ManualFinancialRecord = require('../models/ManualFinancialRecord');
const Church = require('../models/Church');
const { sendChurchNotification, sendUserNotification } = require('../../config/pusher');

// @desc    Create a new manual financial record
// @route   POST /api/financial-records
// @access  Private (Church Members)
const createFinancialRecord = async (req, res) => {
  try {
    const { churchId, recordType, title, description, amount, currency, category, subcategory, transactionDate, source, sourceDetails, donor, vendor, priority } = req.body;

    // Check if church exists
    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Create financial record
    const record = await ManualFinancialRecord.create({
      churchId,
      recordType,
      title,
      description,
      amount,
      currency: currency || church.settings?.currency || 'NGN',
      category,
      subcategory,
      transactionDate: new Date(transactionDate),
      source,
      sourceDetails,
      donor,
      vendor,
      priority,
      recordedBy: req.user.id
    });

    // Send real-time notification
    sendChurchNotification(churchId, 'financial-record-created', {
      recordId: record._id,
      recordType: record.recordType,
      title: record.title,
      amount: record.amount,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { record },
      message: 'Financial record created successfully'
    });
  } catch (error) {
    console.error('Create financial record error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to create financial record' }
    });
  }
};

// @desc    Get all financial records (with filtering)
// @route   GET /api/financial-records
// @access  Private (Church Members)
const getAllFinancialRecords = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { churchId, recordType, status, priority, source, startDate, endDate, search } = req.query;
    const filter = {};

    if (churchId) filter.churchId = churchId;
    if (recordType) filter.recordType = recordType;
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (source) filter.source = source;

    // Date range filter
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
        { 'donor.name': { $regex: search, $options: 'i' } },
        { 'vendor.name': { $regex: search, $options: 'i' } }
      ];
    }

    const records = await ManualFinancialRecord.find(filter)
      .populate('churchId', 'name')
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .populate('reconciledBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ transactionDate: -1 });

    const total = await ManualFinancialRecord.countDocuments(filter);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get all financial records error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get financial records' }
    });
  }
};

// @desc    Get financial record by ID
// @route   GET /api/financial-records/:id
// @access  Private (Church Members)
const getFinancialRecordById = async (req, res) => {
  try {
    const record = await ManualFinancialRecord.findById(req.params.id)
      .populate('churchId', 'name')
      .populate('recordedBy', 'firstName lastName email')
      .populate('verifiedBy', 'firstName lastName email')
      .populate('reconciledBy', 'firstName lastName email');

    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    res.json({
      success: true,
      data: { record }
    });
  } catch (error) {
    console.error('Get financial record by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get financial record' }
    });
  }
};

// @desc    Update financial record
// @route   PUT /api/financial-records/:id
// @access  Private (Church Members)
const updateFinancialRecord = async (req, res) => {
  try {
    const { title, description, amount, category, subcategory, transactionDate, source, sourceDetails, donor, vendor, priority } = req.body;
    const recordId = req.params.id;

    const record = await ManualFinancialRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    // Only allow updates to pending records
    if (record.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot update verified or rejected records' }
      });
    }

    // Update fields
    if (title) record.title = title;
    if (description) record.description = description;
    if (amount) record.amount = amount;
    if (category) record.category = category;
    if (subcategory) record.subcategory = subcategory;
    if (transactionDate) record.transactionDate = new Date(transactionDate);
    if (source) record.source = source;
    if (sourceDetails) record.sourceDetails = { ...record.sourceDetails, ...sourceDetails };
    if (donor) record.donor = { ...record.donor, ...donor };
    if (vendor) record.vendor = { ...record.vendor, ...vendor };
    if (priority) record.priority = priority;

    record.lastModifiedBy = req.user.id;
    record.lastModifiedAt = new Date();

    await record.save();

    res.json({
      success: true,
      data: { record },
      message: 'Financial record updated successfully'
    });
  } catch (error) {
    console.error('Update financial record error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update financial record' }
    });
  }
};

// @desc    Delete financial record
// @route   DELETE /api/financial-records/:id
// @access  Private (Church Admin)
const deleteFinancialRecord = async (req, res) => {
  try {
    const recordId = req.params.id;

    const record = await ManualFinancialRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    // Only allow deletion of pending records
    if (record.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete verified or rejected records' }
      });
    }

    await ManualFinancialRecord.findByIdAndDelete(recordId);

    res.json({
      success: true,
      message: 'Financial record deleted successfully'
    });
  } catch (error) {
    console.error('Delete financial record error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete financial record' }
    });
  }
};

// @desc    Verify financial record
// @route   PUT /api/financial-records/:id/verify
// @access  Private (Church Admin)
const verifyFinancialRecord = async (req, res) => {
  try {
    const { verificationMethod, verificationNotes, confidence } = req.body;
    const recordId = req.params.id;

    const record = await ManualFinancialRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    if (record.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Record is not pending verification' }
      });
    }

    record.verification = {
      verifiedBy: req.user.id,
      verifiedAt: new Date(),
      verificationMethod,
      verificationNotes,
      confidence: confidence || 'medium'
    };

    record.status = 'verified';
    await record.save();

    // Send real-time notification
    sendChurchNotification(record.churchId, 'financial-record-verified', {
      recordId: record._id,
      title: record.title,
      verifiedBy: req.user.id
    });

    res.json({
      success: true,
      data: { record },
      message: 'Financial record verified successfully'
    });
  } catch (error) {
    console.error('Verify financial record error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to verify financial record' }
    });
  }
};

// @desc    Reject financial record
// @route   PUT /api/financial-records/:id/reject
// @access  Private (Church Admin)
const rejectFinancialRecord = async (req, res) => {
  try {
    const { reason, verificationNotes } = req.body;
    const recordId = req.params.id;

    const record = await ManualFinancialRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    if (record.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Record is not pending verification' }
      });
    }

    record.verification = {
      verifiedBy: req.user.id,
      verifiedAt: new Date(),
      verificationMethod: 'manual',
      verificationNotes: reason,
      confidence: 'low'
    };

    record.status = 'rejected';
    await record.save();

    // Send real-time notification
    sendChurchNotification(record.churchId, 'financial-record-rejected', {
      recordId: record._id,
      title: record.title,
      rejectedBy: req.user.id,
      reason
    });

    res.json({
      success: true,
      data: { record },
      message: 'Financial record rejected successfully'
    });
  } catch (error) {
    console.error('Reject financial record error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to reject financial record' }
    });
  }
};

// @desc    Mark financial record as reconciled
// @route   PUT /api/financial-records/:id/reconcile
// @access  Private (Church Admin)
const reconcileFinancialRecord = async (req, res) => {
  try {
    const { reconciliationNotes, bankStatementMatch, bankStatementReference } = req.body;
    const recordId = req.params.id;

    const record = await ManualFinancialRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    if (record.status !== 'verified') {
      return res.status(400).json({
        success: false,
        error: { message: 'Record must be verified before reconciliation' }
      });
    }

    record.reconciliation = {
      isReconciled: true,
      reconciledAt: new Date(),
      reconciledBy: req.user.id,
      reconciliationNotes,
      bankStatementMatch,
      bankStatementReference
    };

    await record.save();

    // Send real-time notification
    sendChurchNotification(record.churchId, 'financial-record-reconciled', {
      recordId: record._id,
      title: record.title,
      reconciledBy: req.user.id
    });

    res.json({
      success: true,
      data: { record },
      message: 'Financial record reconciled successfully'
    });
  } catch (error) {
    console.error('Reconcile financial record error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to reconcile financial record' }
    });
  }
};

// @desc    Add attachment to financial record
// @route   POST /api/financial-records/:id/attachments
// @access  Private (Church Members)
const addAttachment = async (req, res) => {
  try {
    const { filename, originalName, mimetype, size, url } = req.body;
    const recordId = req.params.id;

    const record = await ManualFinancialRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    const attachment = {
      filename,
      originalName,
      mimetype,
      size,
      url,
      uploadedAt: new Date(),
      uploadedBy: req.user.id
    };

    record.attachments.push(attachment);
    await record.save();

    res.status(201).json({
      success: true,
      data: { attachment },
      message: 'Attachment added successfully'
    });
  } catch (error) {
    console.error('Add attachment error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to add attachment' }
    });
  }
};

// @desc    Remove attachment from financial record
// @route   DELETE /api/financial-records/:id/attachments/:attachmentId
// @access  Private (Church Members)
const removeAttachment = async (req, res) => {
  try {
    const { id: recordId, attachmentId } = req.params;

    const record = await ManualFinancialRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    const attachment = record.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attachment not found' }
      });
    }

    record.attachments.pull(attachmentId);
    await record.save();

    res.json({
      success: true,
      message: 'Attachment removed successfully'
    });
  } catch (error) {
    console.error('Remove attachment error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to remove attachment' }
    });
  }
};

// @desc    Add note to financial record
// @route   POST /api/financial-records/:id/notes
// @access  Private (Church Members)
const addNote = async (req, res) => {
  try {
    const { content, type } = req.body;
    const recordId = req.params.id;

    const record = await ManualFinancialRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    const note = {
      content,
      type: type || 'general',
      author: req.user.id,
      date: new Date()
    };

    record.notes.push(note);
    await record.save();

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

// @desc    Update financial record tags
// @route   PUT /api/financial-records/:id/tags
// @access  Private (Church Members)
const updateTags = async (req, res) => {
  try {
    const { tags } = req.body;
    const recordId = req.params.id;

    const record = await ManualFinancialRecord.findById(recordId);
    if (!record) {
      return res.status(404).json({
        success: false,
        error: { message: 'Financial record not found' }
      });
    }

    record.tags = tags;
    await record.save();

    res.json({
      success: true,
      data: { tags: record.tags },
      message: 'Tags updated successfully'
    });
  } catch (error) {
    console.error('Update tags error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update tags' }
    });
  }
};

// @desc    Get financial record statistics
// @route   GET /api/financial-records/stats/overview
// @access  Private (Church Members)
const getFinancialRecordStats = async (req, res) => {
  try {
    const { churchId, startDate, endDate } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    const stats = await ManualFinancialRecord.getFinancialRecordStats(filter.churchId, filter.transactionDate?.$gte, filter.transactionDate?.$lte);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get financial record stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get financial record statistics' }
    });
  }
};

// @desc    Get financial records by type
// @route   GET /api/financial-records/stats/by-type
// @access  Private (Church Members)
const getFinancialRecordsByType = async (req, res) => {
  try {
    const { churchId, startDate, endDate } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    const stats = await ManualFinancialRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$recordType',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 },
          averageAmount: { $avg: '$amount' }
        }
      },
      { $sort: { totalAmount: -1 } }
    ]);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get financial records by type error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get type statistics' }
    });
  }
};

// @desc    Get financial records by date
// @route   GET /api/financial-records/stats/by-date
// @access  Private (Church Members)
const getFinancialRecordsByDate = async (req, res) => {
  try {
    const { churchId, startDate, endDate, groupBy = 'day' } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;
    if (startDate || endDate) {
      filter.transactionDate = {};
      if (startDate) filter.transactionDate.$gte = new Date(startDate);
      if (endDate) filter.transactionDate.$lte = new Date(endDate);
    }

    let dateFormat;
    if (groupBy === 'month') {
      dateFormat = { $dateToString: { format: '%Y-%m', date: '$transactionDate' } };
    } else if (groupBy === 'week') {
      dateFormat = { $dateToString: { format: '%Y-%U', date: '$transactionDate' } };
    } else {
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$transactionDate' } };
    }

    const stats = await ManualFinancialRecord.aggregate([
      { $match: filter },
      {
        $group: {
          _id: dateFormat,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get financial records by date error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get date statistics' }
    });
  }
};

// @desc    Get pending financial records
// @route   GET /api/financial-records/pending
// @access  Private (Church Members)
const getPendingFinancialRecords = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: 'pending' };
    if (churchId) filter.churchId = churchId;

    const records = await ManualFinancialRecord.find(filter)
      .populate('churchId', 'name')
      .populate('recordedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ transactionDate: -1 });

    const total = await ManualFinancialRecord.countDocuments(filter);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get pending financial records error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get pending financial records' }
    });
  }
};

// @desc    Get unverified financial records
// @route   GET /api/financial-records/unverified
// @access  Private (Church Members)
const getUnverifiedFinancialRecords = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: 'pending' };
    if (churchId) filter.churchId = churchId;

    const records = await ManualFinancialRecord.find(filter)
      .populate('churchId', 'name')
      .populate('recordedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ transactionDate: -1 });

    const total = await ManualFinancialRecord.countDocuments(filter);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get unverified financial records error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get unverified financial records' }
    });
  }
};

// @desc    Get unreconciled financial records
// @route   GET /api/financial-records/unreconciled
// @access  Private (Church Members)
const getUnreconciledFinancialRecords = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: 'verified', 'reconciliation.isReconciled': false };
    if (churchId) filter.churchId = churchId;

    const records = await ManualFinancialRecord.find(filter)
      .populate('churchId', 'name')
      .populate('recordedBy', 'firstName lastName')
      .populate('verifiedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ transactionDate: -1 });

    const total = await ManualFinancialRecord.countDocuments(filter);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get unreconciled financial records error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get unreconciled financial records' }
    });
  }
};

// @desc    Get overdue verification financial records
// @route   GET /api/financial-records/overdue-verification
// @access  Private (Church Members)
const getOverdueVerificationFinancialRecords = async (req, res) => {
  try {
    const { churchId, days = 7 } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));

    const filter = { 
      status: 'pending', 
      createdAt: { $lt: cutoffDate }
    };
    if (churchId) filter.churchId = churchId;

    const records = await ManualFinancialRecord.find(filter)
      .populate('churchId', 'name')
      .populate('recordedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: 1 });

    const total = await ManualFinancialRecord.countDocuments(filter);

    res.json({
      success: true,
      data: {
        records,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get overdue verification financial records error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get overdue verification financial records' }
    });
  }
};

module.exports = {
  createFinancialRecord,
  getAllFinancialRecords,
  getFinancialRecordById,
  updateFinancialRecord,
  deleteFinancialRecord,
  verifyFinancialRecord,
  rejectFinancialRecord,
  reconcileFinancialRecord,
  addAttachment,
  removeAttachment,
  addNote,
  updateTags,
  getFinancialRecordStats,
  getFinancialRecordsByType,
  getFinancialRecordsByDate,
  getPendingFinancialRecords,
  getUnverifiedFinancialRecords,
  getUnreconciledFinancialRecords,
  getOverdueVerificationFinancialRecords
};
