import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Protect routes - user must be logged in
export const protect = async (req, res, next) => {
  let token;

  // Get token from cookie or Authorization header
  if (req.cookies.token) {
    token = req.cookies.token;
  } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from database
    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter(decoded.iat)) {
      return res.status(401).json({
        success: false,
        message: 'User recently changed password. Please log in again.'
      });
    }

    // Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Not authorized to access this route'
    });
  }
};

// Role and permission-based authorization
export const authorize = (roles = [], permissions = []) => {
  return (req, res, next) => {
    // Check if user has one of the required roles
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `User role ${req.user?.role || 'unknown'} is not authorized to access this route`
      });
    }

    // If permissions are specified and user is an admin, check permissions
    if (permissions.length > 0 && req.user.role === 'admin') {
      const userPermissions = req.user.permissions || [];
      const hasAllPermissions = permissions.every(perm => userPermissions.includes(perm));
      if (!hasAllPermissions) {
        return res.status(403).json({
          success: false,
          message: `User lacks required permissions: ${permissions.join(', ')}`
        });
      }
    }

    next();
  };
};

// Check if user is verified
export const checkVerified = async (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      success: false,
      message: 'Please verify your email first'
    });
  }
  next();
};

