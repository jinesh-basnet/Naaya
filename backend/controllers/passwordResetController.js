const crypto = require('crypto');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const communicationService = require('../services/communicationService');
const securityLogger = require('../services/securityLogger');

exports.requestReset = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const user = await User.findOne({ email: email.trim().toLowerCase() });

    if (!user) {
      console.log(`[auth] reset requested for unknown email: ${email}`);
      // securityLogger.log(...) - I'll fix this later
      return res.status(200).json({
        message: 'If an account exists, we sent an OTP to the email.'
      });
    }

    const otp = user.generateOTP();
    await user.save();

    console.log(`[auth] sending OTP to ${user.email}`);
    const emailResult = await communicationService.sendOTP(user.email, otp, user.fullName);

    if (emailResult.success) {
      return res.status(200).json({
        message: 'If an account exists, we sent an OTP to the email.'
      });
    } else {
      return res.status(500).json({
        message: 'Failed to send email'
      });
    }

  } catch (error) {
    console.error('[auth] reset request error:', error.message);
    res.status(500).json({ message: 'Server error check logs' });
  }
};


exports.verifyToken = async (req, res) => {
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
};

exports.resetPassword = async (req, res) => {
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
};

exports.verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email?.trim().toLowerCase() });

    if (!user || !user.otp || !user.otpExpires) {
      securityLogger.suspicious('OTP_INVALID', { email }, req.ip, req.headers['user-agent']);
      return res.status(400).json({ message: 'Invalid OTP' });
    }

    if (Date.now() > user.otpExpires) {
      securityLogger.suspicious('OTP_EXPIRED', { email }, req.ip, req.headers['user-agent']);
      return res.status(400).json({ message: 'OTP expired' });
    }

    if (user.otp !== otp) {
      securityLogger.suspicious('OTP_MISMATCH', { email }, req.ip, req.headers['user-agent']);
      return res.status(400).json({ message: 'Incorrect OTP' });
    }

    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    securityLogger.generic('OTP_SUCCESS', { userId: user._id, email }, req.ip, req.headers['user-agent']);

    res.status(200).json({ success: true, message: 'OTP verified', userId: user._id });
  } catch (error) {
    console.error('[auth] OTP verify error:', error.message);
    res.status(500).json({ message: 'Server error check logs' });
  }
};

exports.resetWithOTP = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;
    const user = await User.findOne({ email: email?.trim().toLowerCase() });

    if (!user || user.otp !== otp || Date.now() > user.otpExpires) {
      return res.status(400).json({ message: 'Invalid or expired OTP' });
    }

    user.password = newPassword;
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    res.json({ success: true, message: 'Password reset successful' });
  } catch (error) {
    console.error('[auth] Reset with OTP error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ message: 'Current password incorrect' });
    }

    user.password = newPassword;
    await user.save();

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('[auth] Change password error:', error.message);
    res.status(500).json({ message: 'Server error' });
  }
};

