
const validate = {
  username(val) {
    if (!val || val.length < 3 || val.length > 30) return 'Username must be 3-30 chars';
    if (!/^[a-zA-Z0-9_]+$/.test(val)) return 'Only letters, numbers and underscores allowed';
    return null;
  },

  email(val) {
    if (!val || !val.includes('@') || !val.includes('.')) return 'Provide a valid email';
    return null;
  },

  password(val) {
    if (!val || val.length < 6) return 'Password must be at least 6 characters';
    return null;
  },

  fullName(val) {
    if (!val || val.trim().length < 2) return 'Name is too short';
    return null;
  }
};

const quickCheck = (fields = []) => {
  return (req, res, next) => {
    const errors = [];
    
    fields.forEach(field => {
      const value = req.body[field];
      const error = validate[field] ? validate[field](value) : null;
      if (error) errors.push({ field, message: error });
    });

    if (errors.length > 0) {
      return res.status(400).json({
        message: 'Validation failed',
        errors
      });
    }
    next();
  };
};

module.exports = { validate, quickCheck };

