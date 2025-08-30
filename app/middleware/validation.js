const { validationResult } = require('express-validator');

// Middleware to check for validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details: errors.array().map(error => ({
          field: error.path,
          message: error.msg,
          value: error.value,
        })),
      },
    });
  }
  next();
};

// Sanitize and validate common fields
const sanitizeInput = (req, res, next) => {
  // Remove extra spaces and trim
  Object.keys(req.body).forEach(key => {
    if (typeof req.body[key] === 'string') {
      req.body[key] = req.body[key].trim();
    }
  });

  // Convert empty strings to null
  Object.keys(req.body).forEach(key => {
    if (req.body[key] === '') {
      req.body[key] = null;
    }
  });

  next();
};

// Validate ObjectId format
const validateObjectId = (paramName) => {
  return (req, res, next) => {
    const { ObjectId } = require('mongoose').Types;
    const id = req.params[paramName];

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid ${paramName} format`,
        },
      });
    }

    next();
  };
};

// Validate pagination parameters
const validatePagination = (req, res, next) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;

  if (page < 1) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Page number must be greater than 0',
      },
    });
  }

  if (limit < 1 || limit > 100) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Limit must be between 1 and 100',
      },
    });
  }

  req.pagination = { page, limit, skip: (page - 1) * limit };
  next();
};

// Validate date range parameters
const validateDateRange = (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (startDate) {
    const start = new Date(startDate);
    if (isNaN(start.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid start date format',
        },
      });
    }
    req.dateRange = { startDate: start };
  }

  if (endDate) {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid end date format',
        },
      });
    }
    req.dateRange = { ...req.dateRange, endDate: end };
  }

  // Validate date range logic
  if (req.dateRange && req.dateRange.startDate && req.dateRange.endDate) {
    if (req.dateRange.startDate > req.dateRange.endDate) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Start date cannot be after end date',
        },
      });
    }
  }

  next();
};

// Validate file upload
const validateFileUpload = (allowedTypes = [], maxSize = 5 * 1024 * 1024) => {
  return (req, res, next) => {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'File is required',
        },
      });
    }

    // Check file type
    if (allowedTypes.length > 0 && !allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`,
        },
      });
    }

    // Check file size
    if (req.file.size > maxSize) {
      return res.status(400).json({
        success: false,
        error: {
          message: `File size too large. Maximum size: ${Math.round(maxSize / (1024 * 1024))}MB`,
        },
      });
    }

    next();
  };
};

// Validate amount (positive number)
const validateAmount = (req, res, next) => {
  const { amount } = req.body;

  if (amount === undefined || amount === null) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Amount is required',
      },
    });
  }

  const numAmount = parseFloat(amount);
  if (isNaN(numAmount) || numAmount <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Amount must be a positive number',
      },
    });
  }

  req.body.amount = numAmount;
  next();
};

// Validate email format
const validateEmail = (req, res, next) => {
  const { email } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (email && !emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid email format',
      },
    });
  }

  next();
};

// Validate phone number format (Nigerian format)
const validatePhone = (req, res, next) => {
  const { phone } = req.body;
  
  if (phone) {
    // Remove all non-digit characters
    const cleanPhone = phone.replace(/\D/g, '');
    
    // Check if it's a valid Nigerian phone number
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('0')) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid phone number format. Use Nigerian format (e.g., 08012345678)',
        },
      });
    }
    
    // Format phone number
    req.body.phone = cleanPhone;
  }

  next();
};

module.exports = {
  handleValidationErrors,
  sanitizeInput,
  validateObjectId,
  validatePagination,
  validateDateRange,
  validateFileUpload,
  validateAmount,
  validateEmail,
  validatePhone,
};
