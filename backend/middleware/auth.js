const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        message: req.t('auth:accessTokenRequired'),
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });

    const user = await User.findById(decoded.userId).select('-password');

    if (!user) {
      return res.status(401).json({
        message: req.t('auth:invalidToken'),
        code: 'INVALID_TOKEN'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        message: req.t('auth:accountDeactivated'),
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (user.isDeleted) {
      return res.status(404).json({
        message: req.t('auth:accountNotFound'),
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'CastError') {
      return res.status(401).json({
        message: req.t('auth:invalidToken'),
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        message: req.t('auth:tokenExpired'),
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('Auth middleware error:', error);
    res.status(500).json({
      message: req.t('errors:authError'),
      code: 'AUTH_ERROR'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    const user = await User.findById(decoded.userId).select('-password');

    if (user && user.isActive && !user.isDeleted) {
      req.user = user;
    } else {
      req.user = null;
    }

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

const requireVerified = async (req, res, next) => {
  if (!req.user.isVerified) {
    return res.status(403).json({
      message: req.t('auth:verifiedAccountRequired'),
      code: 'VERIFIED_ACCOUNT_REQUIRED'
    });
  }
  next();
};

module.exports = {
  authenticateToken,
  protect: authenticateToken,
  optionalAuth,
  requireVerified
};
