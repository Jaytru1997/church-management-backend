const Expense = require('../models/Expense');
const Church = require('../models/Church');
const { sendChurchNotification, sendUserNotification } = require('../../config/pusher');
const emailService = require('../../config/email');

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Private (Church Members)
const createExpense = async (req, res) => {
  try {
    const { churchId, title, description, amount, currency, category, subcategory, expenseDate, dueDate, priority, paymentMethod, vendor, budget } = req.body;

    // Check if church exists
    const church = await Church.findById(churchId);
    if (!church) {
      return res.status(404).json({
        success: false,
        error: { message: 'Church not found' }
      });
    }

    // Create expense
    const expense = await Expense.create({
      churchId,
      title,
      description,
      amount,
      currency: currency || church.settings?.currency || 'NGN',
      category,
      subcategory,
      expenseDate: new Date(expenseDate),
      dueDate: dueDate ? new Date(dueDate) : undefined,
      priority,
      paymentMethod,
      vendor,
      budget,
      status: 'pending',
      submittedBy: req.user.id
    });

    // Send real-time notification
    sendChurchNotification(churchId, 'expense-submitted', {
      expenseId: expense._id,
      title: expense.title,
      amount: expense.amount,
      submittedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: { expense },
      message: 'Expense submitted successfully'
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to submit expense' }
    });
  }
};

// @desc    Get all expenses (with filtering)
// @route   GET /api/expenses
// @access  Private (Church Members)
const getAllExpenses = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const { churchId, status, category, priority, startDate, endDate, search } = req.query;
    const filter = {};

    if (churchId) filter.churchId = churchId;
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (priority) filter.priority = priority;

    // Date range filter
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    // Text search
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { 'vendor.name': { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(filter)
      .populate('churchId', 'name')
      .populate('submittedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Expense.countDocuments(filter);

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
    console.error('Get all expenses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get expenses' }
    });
  }
};

// @desc    Get expense by ID
// @route   GET /api/expenses/:id
// @access  Private (Church Members)
const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findById(req.params.id)
      .populate('churchId', 'name')
      .populate('submittedBy', 'firstName lastName email')
      .populate('approvedBy', 'firstName lastName email');

    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
      });
    }

    res.json({
      success: true,
      data: { expense }
    });
  } catch (error) {
    console.error('Get expense by ID error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get expense' }
    });
  }
};

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Private (Church Members)
const updateExpense = async (req, res) => {
  try {
    const { title, description, amount, category, subcategory, expenseDate, dueDate, priority, paymentMethod, vendor, budget } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
      });
    }

    // Only allow updates to pending expenses
    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot update approved or rejected expenses' }
      });
    }

    // Update fields
    if (title) expense.title = title;
    if (description) expense.description = description;
    if (amount) expense.amount = amount;
    if (category) expense.category = category;
    if (subcategory) expense.subcategory = subcategory;
    if (expenseDate) expense.expenseDate = new Date(expenseDate);
    if (dueDate) expense.dueDate = new Date(dueDate);
    if (priority) expense.priority = priority;
    if (paymentMethod) expense.paymentMethod = paymentMethod;
    if (vendor) expense.vendor = { ...expense.vendor, ...vendor };
    if (budget) expense.budget = { ...expense.budget, ...budget };

    expense.lastModifiedBy = req.user.id;
    expense.lastModifiedAt = new Date();

    await expense.save();

    res.json({
      success: true,
      data: { expense },
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('Update expense error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update expense' }
    });
  }
};

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Private (Church Admin)
const deleteExpense = async (req, res) => {
  try {
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
      });
    }

    // Only allow deletion of pending expenses
    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Cannot delete approved or rejected expenses' }
      });
    }

    await Expense.findByIdAndDelete(expenseId);

    res.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to delete expense' }
    });
  }
};

// @desc    Approve expense
// @route   PUT /api/expenses/:id/approve
// @access  Private (Church Admin)
const approveExpense = async (req, res) => {
  try {
    const { approvedAmount, notes } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
      });
    }

    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Expense is not pending approval' }
      });
    }

    expense.approve(req.user.id, approvedAmount || expense.amount, notes);
    await expense.save();

    // Send real-time notification
    sendChurchNotification(expense.churchId, 'expense-approved', {
      expenseId: expense._id,
      title: expense.title,
      amount: expense.amount,
      approvedBy: req.user.id
    });

    // Send notification to submitter
    if (expense.submittedBy) {
      sendUserNotification(expense.submittedBy, 'expense-approved', {
        expenseId: expense._id,
        title: expense.title,
        amount: expense.amount,
        approvedBy: req.user.id
      });
    }

    res.json({
      success: true,
      data: { expense },
      message: 'Expense approved successfully'
    });
  } catch (error) {
    console.error('Approve expense error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to approve expense' }
    });
  }
};

// @desc    Reject expense
// @route   PUT /api/expenses/:id/reject
// @access  Private (Church Admin)
const rejectExpense = async (req, res) => {
  try {
    const { reason, notes } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
      });
    }

    if (expense.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: { message: 'Expense is not pending approval' }
      });
    }

    expense.reject(req.user.id, reason, notes);
    await expense.save();

    // Send real-time notification
    sendChurchNotification(expense.churchId, 'expense-rejected', {
      expenseId: expense._id,
      title: expense.title,
      amount: expense.amount,
      rejectedBy: req.user.id,
      reason
    });

    // Send notification to submitter
    if (expense.submittedBy) {
      sendUserNotification(expense.submittedBy, 'expense-rejected', {
        expenseId: expense._id,
        title: expense.title,
        amount: expense.amount,
        rejectedBy: req.user.id,
        reason
      });
    }

    res.json({
      success: true,
      data: { expense },
      message: 'Expense rejected successfully'
    });
  } catch (error) {
    console.error('Reject expense error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to reject expense' }
    });
  }
};

// @desc    Mark expense as paid
// @route   PUT /api/expenses/:id/mark-paid
// @access  Private (Church Admin)
const markExpenseAsPaid = async (req, res) => {
  try {
    const { paymentDetails, notes } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
      });
    }

    if (expense.status !== 'approved') {
      return res.status(400).json({
        success: false,
        error: { message: 'Expense must be approved before marking as paid' }
      });
    }

    expense.markAsPaid(req.user.id, paymentDetails, notes);
    await expense.save();

    // Send real-time notification
    sendChurchNotification(expense.churchId, 'expense-paid', {
      expenseId: expense._id,
      title: expense.title,
      amount: expense.amount,
      markedBy: req.user.id
    });

    res.json({
      success: true,
      data: { expense },
      message: 'Expense marked as paid successfully'
    });
  } catch (error) {
    console.error('Mark expense as paid error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to mark expense as paid' }
    });
  }
};

// @desc    Add attachment to expense
// @route   POST /api/expenses/:id/attachments
// @access  Private (Church Members)
const addAttachment = async (req, res) => {
  try {
    const { filename, originalName, mimetype, size, url } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
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

    expense.attachments.push(attachment);
    await expense.save();

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

// @desc    Remove attachment from expense
// @route   DELETE /api/expenses/:id/attachments/:attachmentId
// @access  Private (Church Members)
const removeAttachment = async (req, res) => {
  try {
    const { id: expenseId, attachmentId } = req.params;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
      });
    }

    const attachment = expense.attachments.id(attachmentId);
    if (!attachment) {
      return res.status(404).json({
        success: false,
        error: { message: 'Attachment not found' }
      });
    }

    expense.attachments.pull(attachmentId);
    await expense.save();

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

// @desc    Add note to expense
// @route   POST /api/expenses/:id/notes
// @access  Private (Church Members)
const addNote = async (req, res) => {
  try {
    const { content, type } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
      });
    }

    const note = {
      content,
      type: type || 'general',
      author: req.user.id,
      date: new Date()
    };

    expense.notes.push(note);
    await expense.save();

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

// @desc    Update expense tags
// @route   PUT /api/expenses/:id/tags
// @access  Private (Church Members)
const updateTags = async (req, res) => {
  try {
    const { tags } = req.body;
    const expenseId = req.params.id;

    const expense = await Expense.findById(expenseId);
    if (!expense) {
      return res.status(404).json({
        success: false,
        error: { message: 'Expense not found' }
      });
    }

    expense.tags = tags;
    await expense.save();

    res.json({
      success: true,
      data: { tags: expense.tags },
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

// @desc    Get expense statistics
// @route   GET /api/expenses/stats/overview
// @access  Private (Church Members)
const getExpenseStats = async (req, res) => {
  try {
    const { churchId, startDate, endDate } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    const stats = await Expense.getExpenseStats(filter.churchId, filter.expenseDate?.$gte, filter.expenseDate?.$lte);

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get expense stats error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get expense statistics' }
    });
  }
};

// @desc    Get expenses by category
// @route   GET /api/expenses/stats/by-category
// @access  Private (Church Members)
const getExpensesByCategory = async (req, res) => {
  try {
    const { churchId, startDate, endDate } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    const stats = await Expense.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$category',
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
    console.error('Get expenses by category error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get category statistics' }
    });
  }
};

// @desc    Get expenses by date
// @route   GET /api/expenses/stats/by-date
// @access  Private (Church Members)
const getExpensesByDate = async (req, res) => {
  try {
    const { churchId, startDate, endDate, groupBy = 'day' } = req.query;

    const filter = {};
    if (churchId) filter.churchId = churchId;
    if (startDate || endDate) {
      filter.expenseDate = {};
      if (startDate) filter.expenseDate.$gte = new Date(startDate);
      if (endDate) filter.expenseDate.$lte = new Date(endDate);
    }

    let dateFormat;
    if (groupBy === 'month') {
      dateFormat = { $dateToString: { format: '%Y-%m', date: '$expenseDate' } };
    } else if (groupBy === 'week') {
      dateFormat = { $dateToString: { format: '%Y-%U', date: '$expenseDate' } };
    } else {
      dateFormat = { $dateToString: { format: '%Y-%m-%d', date: '$expenseDate' } };
    }

    const stats = await Expense.aggregate([
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
    console.error('Get expenses by date error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get date statistics' }
    });
  }
};

// @desc    Get pending expenses
// @route   GET /api/expenses/pending
// @access  Private (Church Members)
const getPendingExpenses = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: 'pending' };
    if (churchId) filter.churchId = churchId;

    const expenses = await Expense.find(filter)
      .populate('churchId', 'name')
      .populate('submittedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Expense.countDocuments(filter);

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
    console.error('Get pending expenses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get pending expenses' }
    });
  }
};

// @desc    Get approved expenses
// @route   GET /api/expenses/approved
// @access  Private (Church Members)
const getApprovedExpenses = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: 'approved' };
    if (churchId) filter.churchId = churchId;

    const expenses = await Expense.find(filter)
      .populate('churchId', 'name')
      .populate('submittedBy', 'firstName lastName')
      .populate('approvedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Expense.countDocuments(filter);

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
    console.error('Get approved expenses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get approved expenses' }
    });
  }
};

// @desc    Get rejected expenses
// @route   GET /api/expenses/rejected
// @access  Private (Church Members)
const getRejectedExpenses = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { status: 'rejected' };
    if (churchId) filter.churchId = churchId;

    const expenses = await Expense.find(filter)
      .populate('churchId', 'name')
      .populate('submittedBy', 'firstName lastName')
      .populate('rejectedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await Expense.countDocuments(filter);

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
    console.error('Get rejected expenses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get rejected expenses' }
    });
  }
};

// @desc    Get overdue expenses
// @route   GET /api/expenses/overdue
// @access  Private (Church Members)
const getOverdueExpenses = async (req, res) => {
  try {
    const { churchId } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const filter = { dueDate: { $lt: new Date() } };
    if (churchId) filter.churchId = churchId;

    const expenses = await Expense.find(filter)
      .populate('churchId', 'name')
      .populate('submittedBy', 'firstName lastName')
      .skip(skip)
      .limit(limit)
      .sort({ dueDate: 1 });

    const total = await Expense.countDocuments(filter);

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
    console.error('Get overdue expenses error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to get overdue expenses' }
    });
  }
};

module.exports = {
  createExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
  deleteExpense,
  approveExpense,
  rejectExpense,
  markExpenseAsPaid,
  addAttachment,
  removeAttachment,
  addNote,
  updateTags,
  getExpenseStats,
  getExpensesByCategory,
  getExpensesByDate,
  getPendingExpenses,
  getApprovedExpenses,
  getRejectedExpenses,
  getOverdueExpenses
};
