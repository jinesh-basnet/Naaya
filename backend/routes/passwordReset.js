const express = require('express');
const crypto = require('crypto');
const User = require('../models/User');
const { authenticateToken: auth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');
const { sendPasswordResetEmail, sendOTPEmail, emailTemplates, createTransporter } = require('../services/communicationService');
const SecurityLogger = require('../services/securityLogger');
const router = express.Router();

// @route   POST /api/password-reset/request
// @desc    Request password reset with OTP
// @access  Public
router.post('/request', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
], async (req, res) => {
  const securityLogger = new SecurityLogger();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email } = req.body;

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`);
      await securityLogger.logSuspiciousActivity('PASSWORD_RESET_REQUEST_NON_EXISTENT_USER', { email }, req.ip, req.headers['user-agent']);
      return res.status(200).json({
        success: true,
        message: 'If an account with the provided information exists, we have sent an OTP to the registered email.'
      });
    }

    console.log(`Generating OTP for user: ${user.username} (${user.email})`);
    const otp = user.generateOTP();
    await user.save();

    console.log(`Sending OTP email to: ${user.email}`);
    const emailResult = await sendOTPEmail(user.email, otp, user.fullName);

    if (emailResult.success) {
      console.log(`OTP email sent successfully to ${user.email}`);
      await securityLogger.logPasswordChange(user._id, req.ip, req.headers['user-agent']);
      return res.status(200).json({
        success: true,
        message: 'If an account with the provided information exists, we have sent an OTP to the registered email.'
      });
    } else {
      console.error(`Failed to send OTP email to ${user.email}:`, emailResult.error);
      return res.status(500).json({
        success: false,
        message: `Failed to send OTP email: ${emailResult.error || 'Unknown error'}`
      });
    }

  } catch (error) {
    console.error('CRITICAL: Password reset request crash:', error);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});

// @route   POST /api/password-reset/verify
// @desc    Verify password reset token
// @access  Public
router.post('/verify', [
  body('token').notEmpty().withMessage('Reset token is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Token is valid',
      userId: user._id
    });

  } catch (error) {
    console.error('Password reset verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while verifying reset token'
    });
  }
});

// @route   POST /api/password-reset/reset
// @desc    Reset password with token
// @access  Public
router.post('/reset', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { token, newPassword } = req.body;

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired password reset token'
      });
    }

    user.password = newPassword;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Password reset error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while resetting password'
    });
  }
});

// @route   POST /api/password-reset/verify-otp
// @desc    Verify OTP for password reset
// @access  Public
router.post('/verify-otp', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('otp').notEmpty().withMessage('OTP is required')
], async (req, res) => {
  const securityLogger = new SecurityLogger();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otp } = req.body;

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user || !user.otp || !user.otpExpires) {
      await securityLogger.logSuspiciousActivity('OTP_VERIFICATION_FAILED_INVALID_OTP', { email }, req.ip, req.headers['user-agent']);
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP or OTP has expired'
      });
    }

    if (Date.now() > user.otpExpires) {
      await securityLogger.logSuspiciousActivity('OTP_VERIFICATION_FAILED_EXPIRED', { email }, req.ip, req.headers['user-agent']);
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.otp !== otp) {
      await securityLogger.logSuspiciousActivity('OTP_VERIFICATION_FAILED_INVALID', { email }, req.ip, req.headers['user-agent']);
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    await securityLogger.log('OTP_VERIFICATION_SUCCESS', { userId: user._id, email }, req.ip, req.headers['user-agent']);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      userId: user._id
    });

  } catch (error) {
    console.error('OTP verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while verifying OTP'
    });
  }
});

// @route   POST /api/password-reset/reset-with-otp
// @desc    Reset password with OTP verification
// @access  Public
router.post('/reset-with-otp', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('otp').notEmpty().withMessage('OTP is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user || !user.otp || !user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP or OTP has expired'
      });
    }

    if (Date.now() > user.otpExpires) {
      return res.status(400).json({
        success: false,
        message: 'OTP has expired. Please request a new one.'
      });
    }

    if (user.otp !== otp) {
      return res.status(400).json({
        success: false,
        message: 'Invalid OTP'
      });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been reset successfully'
    });

  } catch (error) {
    console.error('Password reset with OTP error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while resetting password'
    });
  }
});

// @route   POST /api/password-reset/change
// @desc    Change password (authenticated user)
// @access  Private
router.post('/change', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password has been changed successfully'
    });

  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error occurred while changing password'
    });
  }
});

module.exports = router;
