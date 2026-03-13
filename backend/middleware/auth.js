const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    console.log(`🔐 AUTH DEBUG [${req.method}] ${req.originalUrl} - Token present: ${!!token}, IP: ${req.ip}`);

    if (!token) {
      console.log('🚫 NO_TOKEN - 401');
      return res.status(401).json({
        message: req.t('auth:accessTokenRequired'),
        code: 'NO_TOKEN'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256']
    });
    console.log(`✅ Token decoded for userId: ${decoded.userId}`);

    const user = await User.findById(decoded.userId).select('-password');
    console.log(`👤 User found: ${!!user}, isActive: ${user ? user.isActive : 'N/A'}`);

    if (!user) {
      console.log('🚫 NO_USER - 401');
      return res.status(401).json({
        message: req.t('auth:invalidToken'),
        code: 'INVALID_TOKEN'
      });
    }

    if (!user.isActive) {
      console.log('🚫 INACTIVE_USER - 401');
      return res.status(401).json({
        message: req.t('auth:accountDeactivated'),
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    if (user.isDeleted) {
      console.log('🚫 DELETED_USER - 404');
      return res.status(404).json({
        message: req.t('auth:accountNotFound'),
        code: 'ACCOUNT_NOT_FOUND'
      });
    }

    req.user = user;
    console.log(`✅ AUTH SUCCESS for ${user.username}`);
    next();
  } catch (error) {
    console.error('🔥 AUTH ERROR:', error.name, error.message);
    if (error.name === 'JsonWebTokenError' || error.name === 'CastError') {
      console.log('🚫 INVALID_TOKEN - 401');
      return res.status(401).json({
        message: req.t('auth:invalidToken'),
        code: 'INVALID_TOKEN'
      });
    }

    if (error.name === 'TokenExpiredError') {
      console.log('⏰ TOKEN_EXPIRED - 401');
      return res.status(401).json({
        message: req.t('auth:tokenExpired'),
        code: 'TOKEN_EXPIRED'
      });
    }

    console.error('💥 Auth middleware error:', error);
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
  console.log(`🔍 VERIFY CHECK: ${req.user ? req.user.username : 'no user' } isVerified: ${req.user ? req.user.isVerified : false}`);
  if (!req.user.isVerified) {
    console.log('🚫 UNVERIFIED_USER - 403');
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
