const jwt = require('jsonwebtoken');
const User = require('../models/User');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    console.log('Auth middleware - authHeader:', authHeader ? 'present' : 'missing');
    const token = authHeader && authHeader.split(' ')[1];
    console.log('Auth middleware - token:', token ? 'present' : 'missing');

    if (!token) {
      console.log('Auth middleware - no token provided');
      return res.status(401).json({
        message: req.t('auth:accessTokenRequired'),
        code: 'NO_TOKEN'
      });
    }

    console.log('Auth middleware - verifying token with JWT_SECRET');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('Auth middleware - decoded userId:', decoded.userId);

    const user = await User.findById(decoded.userId).select('-password');
    console.log('Auth middleware - user found:', user ? 'yes' : 'no');

    if (!user) {
      console.log('Auth middleware - user not found for userId:', decoded.userId);
      return res.status(401).json({
        message: req.t('auth:invalidToken'),
        code: 'INVALID_TOKEN'
      });
    }

    if (!user.isActive) {
      console.log('Auth middleware - user not active');
      return res.status(401).json({
        message: req.t('auth:accountDeactivated'),
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    req.user = user;

    if (user.languagePreference === 'nepali') {
      req.i18n.changeLanguage('ne');
    } else if (user.languagePreference === 'english') {
      req.i18n.changeLanguage('en');
    }

    console.log('Auth middleware - authentication successful for user:', user._id);
    next();
  } catch (error) {
    console.log('Auth middleware - error:', error.name, error.message);
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId).select('-password');

    if (user && user.isActive) {
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

const requireBusinessOwner = async (req, res, next) => {
  next();
};

const requireVerified = async (req, res, next) => {
  try {
    if (!req.user.isVerified) {
      return res.status(403).json({
        message: req.t('auth:verifiedAccountRequired'),
        code: 'VERIFIED_ACCOUNT_REQUIRED'
      });
    }
    next();
  } catch (error) {
    console.error('Verified user middleware error:', error);
    res.status(500).json({
      message: 'Authorization error',
      code: 'AUTH_ERROR'
    });
  }
};

const requireOffice = async (req, res, next) => {
  try {
    if (req.user.role !== 'office') {
      return res.status(403).json({
        message: req.t('auth:officeAccessRequired'),
        code: 'OFFICE_ACCESS_REQUIRED'
      });
    }
    next();
  } catch (error) {
    console.error('Office middleware error:', error);
    res.status(500).json({
      message: 'Authorization error',
      code: 'AUTH_ERROR'
    });
  }
};

module.exports = {
  authenticateToken,
  protect: authenticateToken,
  optionalAuth,
  requireBusinessOwner,
  requireVerified,
  requireOffice
};
