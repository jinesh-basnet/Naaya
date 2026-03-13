const express = require('express');
const { body } = require('express-validator');
const { authenticateToken } = require('../middleware/auth');
const { loginRateLimiter, registerRateLimiter } = require('../middleware/rateLimiter');
const authController = require('../controllers/authController');

const router = express.Router();

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', registerRateLimiter, [
  body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage((value, { req }) => req.t('auth:validation.usernameLength')),
  body('email')
    .isEmail()
    .withMessage((value, { req }) => req.t('auth:validation.invalidEmail'))
    .normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage((value, { req }) => req.t('auth:validation.passwordLength'))
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
    .withMessage((value, { req }) => req.t('auth:validation.passwordStrength')),
  body('fullName')
    .isLength({ min: 2, max: 50 })
    .withMessage((value, { req }) => req.t('auth:validation.fullNameLength'))
    .trim()
], authController.register);

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
], authController.login);

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', authenticateToken, authController.getMe);

// @route   POST /api/auth/send-verification
// @desc    Send email verification
// @access  Private
router.post('/send-verification', authenticateToken, authController.sendVerification);

// @route   POST /api/auth/verify-email
// @desc    Verify email with token
// @access  Public
router.post('/verify-email', [
  body('token').notEmpty().withMessage('Verification token is required')
], authController.verifyEmail);

// @route   POST /api/auth/refresh
// @desc    Refresh access token using refresh token
// @access  Public
router.post('/refresh', loginRateLimiter, [
  body('refreshToken')
    .notEmpty()
    .withMessage('Refresh token is required')
], authController.refreshToken);

module.exports = router;
