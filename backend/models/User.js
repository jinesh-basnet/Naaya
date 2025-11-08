const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3,
    maxlength: 30
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  phone: {
    type: String,
    unique: true,
    sparse: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  fullName: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  bio: {
    type: String,
    maxlength: 150,
    default: ''
  },
  profilePicture: {
    type: String,
    default: ''
  },
  coverPicture: {
    type: String,
    default: ''
  },
  location: {
    city: {
      type: String,
      default: ''
    },
    district: {
      type: String,
      default: ''
    },
    province: {
      type: String,
      default: ''
    },
    coordinates: {
      lat: Number,
      lng: Number
    }
  },
  languagePreference: {
    type: String,
    enum: ['nepali', 'english', 'both'],
    default: 'both'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  followersCount: {
    type: Number,
    default: 0,
    index: true
  },
  followingCount: {
    type: Number,
    default: 0,
    index: true
  },

  interests: [{
    type: String,
    enum: [
      'technology', 'music', 'sports', 'food', 'travel', 'fashion',
      'photography', 'art', 'education', 'news', 'entertainment',
      'health', 'fitness', 'gaming', 'books', 'movies', 'politics',
      'religion', 'culture', 'festivals', 'tourism', 'agriculture'
    ]
  }],
  privacySettings: {
    profileVisibility: {
      type: String,
      enum: ['public', 'followers', 'private'],
      default: 'public'
    },
    showOnlineStatus: {
      type: Boolean,
      default: true
    },
    allowMessagesFrom: {
      type: String,
      enum: ['everyone', 'followers', 'none'],
      default: 'everyone'
    }
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  },
  role: {
    type: String,
    enum: ['user', 'moderator', 'office'],
    default: 'user'
  },
  isBanned: {
    type: Boolean,
    default: false
  },
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetExpires: {
    type: Date,
    default: null
  },
  otp: {
    type: String,
    default: null
  },
  otpExpires: {
    type: Date,
    default: null
  },
  emailVerificationToken: {
    type: String,
    default: null
  },
  emailVerificationExpires: {
    type: Date,
    default: null
  },
  failedLoginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },
  refreshTokens: [{
    token: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    expiresAt: {
      type: Date,
      required: true
    },
    userAgent: String,
    ipAddress: String
  }],
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    },
    userAgent: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  closeFriends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  highlights: [{
    title: {
      type: String,
      required: true,
      maxlength: 30
    },
    coverStory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story',
      required: true
    },
    stories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Story',
      required: true
    }],
    isPublic: {
      type: Boolean,
      default: true
    },
    isArchived: {
      type: Boolean,
      default: false
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  notificationPreferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    pushNotifications: {
      type: Boolean,
      default: true
    },
    soundEffects: {
      type: Boolean,
      default: true
    }
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });
userSchema.index({ 'location.city': 1 });
userSchema.index({ 'location.district': 1 });
userSchema.index({ 'location.province': 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ interests: 1 });
userSchema.index({ lastActive: -1 });
userSchema.index({ isDeleted: 1 });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.generatePasswordResetToken = function() {
  const crypto = require('crypto');
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.passwordResetToken = crypto.createHash('sha256').update(resetToken).digest('hex');
  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; 
  
  return resetToken;
};

userSchema.methods.generateEmailVerificationToken = function() {
  const crypto = require('crypto');
  const verificationToken = crypto.randomBytes(32).toString('hex');

  this.emailVerificationToken = crypto.createHash('sha256').update(verificationToken).digest('hex');
  this.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000;

  return verificationToken;
};

userSchema.methods.generateOTP = function() {
  const otp = Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit OTP

  this.otp = otp;
  this.otpExpires = Date.now() + 10 * 60 * 1000; 

  return otp;
};

userSchema.methods.getPublicProfile = function() {
  const userObj = this.toObject();
  delete userObj.password;
  delete userObj.email;
  delete userObj.phone;
  return userObj;
};


userSchema.virtual('isLocked').get(function() {
  return !!(this.lockUntil && this.lockUntil > Date.now());
});

userSchema.methods.incLoginAttempts = function() {
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $unset: { lockUntil: 1 },
      $set: { failedLoginAttempts: 1 }
    });
  }
  const updates = { $inc: { failedLoginAttempts: 1 } };
  if (this.failedLoginAttempts + 1 >= 5 && !this.isLocked) {
    updates.$set = {
      lockUntil: Date.now() + 2 * 60 * 60 * 1000 
    };
  }
  return this.updateOne(updates);
};

userSchema.methods.resetLoginAttempts = function() {
  return this.updateOne({
    $unset: { failedLoginAttempts: 1, lockUntil: 1 },
    $set: { lastActive: new Date() }
  });
};

userSchema.methods.addRefreshToken = function(token, userAgent, ipAddress) {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  this.refreshTokens.push({
    token: hashedToken,
    expiresAt,
    userAgent,
    ipAddress
  });

  if (this.refreshTokens.length > 5) {
    this.refreshTokens = this.refreshTokens.slice(-5);
  }

  return this.save();
};

userSchema.methods.removeRefreshToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  this.refreshTokens = this.refreshTokens.filter(rt => rt.token !== hashedToken);
  return this.save();
};

userSchema.methods.removeExpiredRefreshTokens = function() {
  const now = new Date();
  this.refreshTokens = this.refreshTokens.filter(rt => rt.expiresAt > now);
  return this.save();
};

userSchema.methods.isValidRefreshToken = function(token) {
  const crypto = require('crypto');
  const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
  return this.refreshTokens.some(rt => rt.token === hashedToken && rt.expiresAt > new Date());
};

userSchema.methods.clearAllRefreshTokens = function() {
  this.refreshTokens = [];
  return this.save();
};

module.exports = mongoose.model('User', userSchema);
