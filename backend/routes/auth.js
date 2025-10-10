const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { authenticateToken } = require('../middleware/auth');
const { loginRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');
const SecurityLogger = require('../services/securityLogger');

const router = express.Router();

const generateAccessToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );
};

const generateRefreshToken = () => {
  return require('crypto').randomBytes(64).toString('hex');
};

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerRateLimiter, [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters'),
  body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage('Password must include at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('fullName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .trim()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { username, email, password, fullName, phone, location, languagePreference } = req.body;

    const existingUser = await User.findOne({
      $or: [{ email }, { username }, ...(phone ? [{ phone }] : [])]
    });

    if (existingUser) {
      let field = 'email';
      if (existingUser.username === username) field = 'username';
      if (existingUser.phone === phone) field = 'phone';
      
      return res.status(400).json({
        message: `User with this ${field} already exists`,
        code: 'USER_EXISTS'
      });
    }

    const user = new User({
      username,
      email,
      password,
      fullName,
      phone,
      location: location || {},
      languagePreference: languagePreference || 'both'
    });

    await user.save();

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    await user.addRefreshToken(refreshToken, req.headers['user-agent'], req.ip);

    const userData = user.getPublicProfile();

    res.status(201).json({
      message: 'User registered successfully',
      accessToken,
      refreshToken,
      user: userData
    });

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      message: 'Server error during registration',
      code: 'REGISTRATION_ERROR'
    });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', loginRateLimiter, [
  body('identifier')
    .notEmpty()
    .withMessage('Email, username, or phone is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [
        { email: identifier },
        { username: identifier },
        { phone: identifier }
      ]
    });

    if (!user) {
      await new SecurityLogger().logFailedLogin(identifier, 'User not found', req.ip, req.headers['user-agent']);
      return res.status(401).json({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    if (user.isLocked) {
      await new SecurityLogger().logAccountLockout(identifier, req.ip, req.headers['user-agent']);
      return res.status(423).json({
        message: 'Account is temporarily locked due to too many failed login attempts',
        code: 'ACCOUNT_LOCKED'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        message: 'Account is deactivated',
        code: 'ACCOUNT_DEACTIVATED'
      });
    }

    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      await user.incLoginAttempts();
      await new SecurityLogger().logFailedLogin(identifier, 'Invalid password', req.ip, req.headers['user-agent']);
      return res.status(401).json({
        message: 'Invalid credentials',
        code: 'INVALID_CREDENTIALS'
      });
    }

    await user.resetLoginAttempts();
    await new SecurityLogger().logLoginAttempt(identifier, true, req.ip, req.headers['user-agent']);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken();
    await user.addRefreshToken(refreshToken, req.headers['user-agent'], req.ip);

    const userData = user.getPublicProfile();

    res.json({
      message: 'Login successful',
      accessToken,
      refreshToken,
      user: userData
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      message: 'Server error during login',
      code: 'LOGIN_ERROR'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const userData = req.user.getPublicProfile();
    res.json({
      message: 'User data retrieved successfully',
      user: userData
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      message: 'Server error retrieving user data',
      code: 'USER_DATA_ERROR'
    });
  }
});

// @route   POST /api/auth/send-verification
// @desc    Send email verification
// @access  Private
router.post('/send-verification', authenticateToken, async (req, res) => {
  try {
    const user = req.user;

    if (user.isVerified) {
      return res.status(400).json({
        message: 'Email is already verified',
        code: 'ALREADY_VERIFIED'
      });
    }

    const verificationToken = user.generateEmailVerificationToken();
    await user.save();

    res.json({
      message: 'Verification email sent',
      verificationUrl: `${process.env.CLIENT_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`
    });

  } catch (error) {
    console.error('Send verification error:', error);
    res.status(500).json({
      message: 'Server error sending verification',
      code: 'SEND_VERIFICATION_ERROR'
    });
  }
});

// @route   POST /api/auth/verify-email
// @desc    Verify email with token
// @access  Public
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token } = req.body;

    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired verification token',
        code: 'INVALID_TOKEN'
      });
    }

    user.isVerified = true;
    user.emailVerificationToken = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    res.json({
      message: 'Email verified successfully'
    });

  } catch (error) {
    console.error('Verify email error:', error);
    res.status(500).json({
      message: 'Server error verifying email',
      code: 'VERIFY_EMAIL_ERROR'
    });
  }
});

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh', loginRateLimiter, [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { refreshToken } = req.body;

    const crypto = require('crypto');
    const hashedToken = crypto.createHash('sha256').update(refreshToken).digest('hex');

    const user = await User.findOne({
      'refreshTokens.token': hashedToken,
      'refreshTokens.expiresAt': { $gt: new Date() }
    });

    if (!user) {
      return res.status(401).json({
        message: 'Invalid or expired refresh token',
        code: 'INVALID_REFRESH_TOKEN'
      });
    }

    await user.removeExpiredRefreshTokens();

    await user.removeRefreshToken(refreshToken);

    const newAccessToken = generateAccessToken(user._id);
    const newRefreshToken = generateRefreshToken();
    await user.addRefreshToken(newRefreshToken, req.headers['user-agent'], req.ip);

    const userData = user.getPublicProfile();

    res.json({
      message: 'Tokens refreshed successfully',
      accessToken: newAccessToken,
      refreshToken: newRefreshToken,
      user: userData
    });

  } catch (error) {
    console.error('Refresh token error:', error);
    res.status(500).json({
      message: 'Server error refreshing token',
      code: 'REFRESH_ERROR'
    });
  }
});

module.exports = router;
