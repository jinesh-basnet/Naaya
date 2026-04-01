const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const highlightSchema = new mongoose.Schema({
  title: { type: String, required: true },
  coverStory: { type: mongoose.Schema.Types.ObjectId, ref: 'Story' },
  stories: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Story' }],
  isPublic: { type: Boolean, default: true },
  isArchived: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { _id: true, strictPopulate: false });

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
  gender: {
    type: String,
    enum: ['male', 'female', 'other'],
    default: 'other'
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
    city: { type: String, default: '' },
    district: { type: String, default: '' },
    province: { type: String, default: '' }
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
  followersCount: { type: Number, default: 0 },
  followingCount: { type: Number, default: 0 },
  interests: [{ type: String }],
  privacySettings: {
    profileVisibility: { type: String, default: 'public' },
    showOnlineStatus: { type: Boolean, default: true }
  },
  lastActive: { type: Date, default: Date.now },
  isActive: { type: Boolean, default: true },
  role: { type: String, default: 'user' },
  resetToken: String,
  resetTokenExpires: Date,
  verificationToken: String,
  refreshTokens: [String], 
  encryption: {
    publicKey: String,
    privateKeyEncrypted: { type: String, select: false }
  },
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    },
    userAgent: String,
    createdAt: { type: Date, default: Date.now }
  }],
  notificationPreferences: {
    emailNotifications: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    soundEffects: { type: Boolean, default: true }
  },
  closeFriends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  highlights: [highlightSchema]
}, {
  timestamps: true,
  strictPopulate: false
});

userSchema.index({ username: 1 });
userSchema.index({ email: 1 });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

userSchema.methods.getPublicProfile = function () {
  const userObj = this.toObject();
  delete userObj.password;
  delete userObj.refreshTokens;
  delete userObj.verificationToken;
  delete userObj.resetToken;
  return userObj;
};

module.exports = mongoose.model('User', userSchema);
