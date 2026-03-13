const express = require('express');
const { body } = require('express-validator');
const { authenticateToken: auth } = require('../middleware/auth');
const passwordResetController = require('../controllers/passwordResetController');

const router = express.Router();

// @route   POST /api/password-reset/request
// @desc    Request password reset with OTP
// @access  Public
router.post('/request', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
], passwordResetController.requestReset);

// @route   POST /api/password-reset/verify
// @desc    Verify password reset token
// @access  Public
router.post('/verify', [
  body('token').notEmpty().withMessage('Reset token is required')
], passwordResetController.verifyToken);

// @route   POST /api/password-reset/reset
// @desc    Reset password with token
// @access  Public
router.post('/reset', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], passwordResetController.resetPassword);

// @route   POST /api/password-reset/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('otp').notEmpty().withMessage('OTP is required')
], passwordResetController.verifyOTP);

// @route   POST /api/password-reset/reset-with-otp
// @desc    Reset password with OTP verification
// @access  Public
router.post('/reset-with-otp', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('otp').notEmpty().withMessage('OTP is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], passwordResetController.resetWithOTP);

// @route   POST /api/password-reset/change
// @desc    Change password (authenticated user)
// @access  Private
router.post('/change', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], passwordResetController.changePassword);

module.exports = router;
