const express = require('express');
const { body } = require('express-validator');
const { authenticateToken: auth } = require('../middleware/auth');
const passwordResetController = require('../controllers/passwordResetController');

const router = express.Router();

router.post('/request', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
], passwordResetController.requestReset);

router.post('/verify', [
  body('token').notEmpty().withMessage('Reset token is required')
], passwordResetController.verifyToken);

router.post('/reset', [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], passwordResetController.resetPassword);

router.post('/verify-otp', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('otp').notEmpty().withMessage('OTP is required')
], passwordResetController.verifyOTP);

router.post('/reset-with-otp', [
  body('email').isEmail().withMessage('Please provide a valid email address'),
  body('otp').notEmpty().withMessage('OTP is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
], passwordResetController.resetWithOTP);

router.post('/change', [
  auth,
  body('currentPassword').notEmpty().withMessage('Current password is required'),
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters long')
], passwordResetController.changePassword);

module.exports = router;

