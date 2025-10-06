const { body, validationResult } = require('express-validator');

const commonValidations = {
  username: body('username')
    .isLength({ min: 3, max: 30 })
    .withMessage('Username must be between 3 and 30 characters')
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage('Username can only contain letters, numbers, and underscores'),

  email: body('email')
    .isEmail()
    .withMessage('Please provide a valid email')
    .normalizeEmail(),

  password: body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),

  fullName: body('fullName')
    .isLength({ min: 2, max: 50 })
    .withMessage('Full name must be between 2 and 50 characters')
    .trim(),

  phone: body('phone')
    .optional()
    .isMobilePhone('ne-NP')
    .withMessage('Please provide a valid Nepali phone number'),
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      message: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

module.exports = {
  commonValidations,
  handleValidationErrors
};
