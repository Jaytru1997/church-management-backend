const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Protect routes - verify JWT token
const protect = async (req, res, next) => {
  let token;

  // Check for token in headers
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }
  // Check for token in cookies
  else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  // Check if token exists
  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Not authorized to access this route - No token provided',
      },
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized to access this route - User not found',
        },
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized to access this route - Account deactivated',
        },
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        message: 'Not authorized to access this route - Invalid token',
      },
    });
  }
};

// Grant access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: {
          message: 'Not authorized to access this route',
        },
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          message: `User role '${req.user.role}' is not authorized to access this route`,
        },
      });
    }

    next();
  };
};

// Check if user owns the church or is a member
const checkChurchAccess = async (req, res, next) => {
  try {
    const { churchId } = req.params;
    
    if (!churchId) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Church ID is required',
        },
      });
    }

    // Check if user owns the church
    const userChurches = req.user.churches || [];
    const isOwner = userChurches.some(church => 
      church.churchId.toString() === churchId && church.role === 'admin'
    );

    if (isOwner) {
      req.churchAccess = { role: 'admin', churchId };
      return next();
    }

    // Check if user is a member of the church
    const Member = require('../models/Member');
    const member = await Member.findOne({
      userId: req.user._id,
      churchId,
      isActive: true,
    });

    if (member) {
      req.churchAccess = { role: member.role, churchId };
      return next();
    }

    return res.status(403).json({
      success: false,
      error: {
        message: 'Not authorized to access this church',
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: {
        message: 'Error checking church access',
      },
    });
  }
};

// Check if user can manage specific resource
const checkResourceAccess = (resourceModel) => {
  return async (req, res, next) => {
    try {
      const resourceId = req.params.id;
      const { churchId } = req.churchAccess || {};

      if (!churchId) {
        return res.status(400).json({
          success: false,
          error: {
            message: 'Church access not verified',
          },
        });
      }

      // Check if resource belongs to the church
      const resource = await resourceModel.findOne({
        _id: resourceId,
        churchId,
      });

      if (!resource) {
        return res.status(404).json({
          success: false,
          error: {
            message: 'Resource not found',
          },
        });
      }

      req.resource = resource;
      next();
    } catch (error) {
      return res.status(500).json({
        success: false,
        error: {
          message: 'Error checking resource access',
        },
      });
    }
  };
};

// Optional authentication - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }

  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      if (user && user.isActive) {
        req.user = user;
      }
    } catch (error) {
      // Token is invalid, but we don't fail the request
      console.log('Optional auth failed:', error.message);
    }
  }

  next();
};

module.exports = {
  protect,
  authorize,
  checkChurchAccess,
  checkResourceAccess,
  optionalAuth,
};
