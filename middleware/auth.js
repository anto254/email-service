// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { updateSessionActivity } = require('../utils/sessionManager');

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Access token required',
        statusCode: 401
      });
    }

    // Verify the JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from database
    const user = await User.findById(decoded.id).select('-password -refreshToken');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User not found',
        statusCode: 401
      });
    }

    if (user.status !== 'Active') {
      return res.status(403).json({
        success: false,
        message: 'Account is deactivated',
        statusCode: 403
      });
    }

    // Update session activity if session ID is available
    if (decoded.sessionId) {
      req.sessionId = decoded.sessionId;
      await updateSessionActivity(decoded.sessionId);
    }

    // Add user to request object
    req.user = user;
    next();

  } catch (error) {
    let message = 'Invalid or expired token';
    let statusCode = 401;

    if (error.name === 'TokenExpiredError') {
      message = 'Token has expired';
    } else if (error.name === 'JsonWebTokenError') {
      message = 'Invalid token format';
    }

    return res.status(statusCode).json({
      success: false,
      message,
      statusCode
    });
  }
};

// Optional authentication middleware (doesn't fail if no token)
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'] || req.headers['Authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password -refreshToken');
      
      if (user && user.status === 'Active') {
        req.user = user;
        req.sessionId = decoded.sessionId;
        
        // Update session activity if session ID is available
        if (decoded.sessionId) {
          await updateSessionActivity(decoded.sessionId);
        }
      }
    }
    
    next();
  } catch (error) {
    // Silently continue without authentication
    next();
  }
};

// Role-based authorization middleware
const requireRole = (allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        statusCode: 401
      });
    }

    const userRole = req.user.roles || req.user.role;
    const rolesArray = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (!rolesArray.includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Insufficient permissions',
        statusCode: 403
      });
    }

    next();
  };
};

// Permission-based authorization middleware
const requirePermission = (requiredPermission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required',
        statusCode: 401
      });
    }

    const userPermissions = req.user.permissions || [];
    
    if (!userPermissions.includes(requiredPermission)) {
      return res.status(403).json({
        success: false,
        message: 'Permission denied',
        statusCode: 403
      });
    }

    next();
  };
};

// Admin-only middleware
const requireAdmin = requireRole('admin');

// Self or admin middleware (user can access their own data or admin can access anyone's)
const requireSelfOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Authentication required',
      statusCode: 401
    });
  }

  const userRole = req.user.roles || req.user.role;
  const targetUserId = req.params.userId || req.params.id;
  
  // Allow if user is admin or accessing their own data
  if (userRole === 'admin' || req.user._id.toString() === targetUserId) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'You can only access your own data',
    statusCode: 403
  });
};

// Rate limiting middleware for sensitive operations
const rateLimitSensitive = (windowMs = 15 * 60 * 1000, maxAttempts = 5) => {
  const attempts = new Map();

  return (req, res, next) => {
    const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
               req.headers['x-real-ip'] ||
               req.connection?.remoteAddress ||
               req.ip;
    
    const now = Date.now();
    const windowStart = now - windowMs;

    // Clean old attempts
    for (const [key, value] of attempts.entries()) {
      if (value.timestamp < windowStart) {
        attempts.delete(key);
      }
    }

    // Check current attempts
    const userAttempts = attempts.get(ip) || { count: 0, timestamp: now };
    
    if (userAttempts.count >= maxAttempts && userAttempts.timestamp > windowStart) {
      return res.status(429).json({
        success: false,
        message: 'Too many attempts. Please try again later.',
        statusCode: 429,
        retryAfter: Math.ceil((userAttempts.timestamp + windowMs - now) / 1000)
      });
    }

    // Increment attempts
    if (userAttempts.timestamp > windowStart) {
      userAttempts.count += 1;
    } else {
      userAttempts.count = 1;
      userAttempts.timestamp = now;
    }
    attempts.set(ip, userAttempts);

    next();
  };
};

// Middleware to validate session consistency
const validateSession = async (req, res, next) => {
  
  try {
    const { sessionId } = req.cookies;
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token && sessionId) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      if (decoded.sessionId && decoded.sessionId !== sessionId) {
        // Session mismatch - clear cookies and require re-authentication
        res.clearCookie('refreshToken');
        res.clearCookie('sessionId');
        
        return res.status(401).json({
          success: false,
          message: 'Session mismatch. Please log in again.',
          statusCode: 401
        });
      }
    }

    next();
  } catch (error) {
    next(); // Continue if token verification fails (will be handled by authenticateToken)
  }
};

module.exports = {
  authenticateToken,
  optionalAuth,
  requireRole,
  requirePermission,
  requireAdmin,
  requireSelfOrAdmin,
  rateLimitSensitive,
  validateSession
};