const mongoose = require('mongoose');

const reelSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  video: {
    url: {
      type: String,
      required: true
    },
    publicId: String,
    duration: {
      type: Number,
      required: true
    },
    size: Number,
    width: Number,
    height: Number,
    format: String,
    thumbnail: String
  },
  audio: {
    title: String,
    artist: String,
    url: String,
    startTime: Number,
    duration: Number,
    isOriginal: {
      type: Boolean,
      default: true
    }
  },
  caption: {
    type: String,
    maxlength: 2200,
    default: ''
  },
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  location: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    city: String,
    district: String,
    province: String
  },
  language: {
    type: String,
    enum: ['nepali', 'english', 'mixed'],
    default: 'english'
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  likes: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    likedAt: {
      type: Date,
      default: Date.now
    }
  }],
  comments: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 500
    },
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null
    },
    likes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      likedAt: {
        type: Date,
        default: Date.now
      }
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  shares: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    sharedAt: {
      type: Date,
      default: Date.now
    }
  }],
  saves: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  views: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    viewedAt: {
      type: Date,
      default: Date.now
    }
  }],
  likesCount: {
    type: Number,
    default: 0
  },
  commentsCount: {
    type: Number,
    default: 0
  },
  sharesCount: {
    type: Number,
    default: 0
  },
  savesCount: {
    type: Number,
    default: 0
  },
  viewsCount: {
    type: Number,
    default: 0
  },
  effects: [{
    type: {
      type: String,
      enum: ['filter', 'transition', 'sticker', 'text', 'emoji']
    },
    name: String,
    parameters: mongoose.Schema.Types.Mixed,
    startTime: Number,
    duration: Number
  }],
  filter: {
    type: String,
    enum: ['none', 'clarendon', 'gingham', 'moon', 'lark', 'reyes', 'juno', 'slumber', 'crema', 'ludwig', 'aden', 'perpetua', 'sepia', 'grayscale', 'vintage', 'bright', 'contrast', 'warm', 'cool'],
    default: 'none'
  },
  brightness: {
    type: Number,
    min: -100,
    max: 100,
    default: 0
  },
  contrast: {
    type: Number,
    min: -100,
    max: 100,
    default: 0
  },
  engagementScore: {
    type: Number,
    default: 0
  },
  localScore: {
    type: Number,
    default: 0
  },
  languageScore: {
    type: Number,
    default: 0
  },
  relationshipScore: {
    type: Number,
    default: 0
  },
  finalScore: {
    type: Number,
    default: 0
  },
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  reports: [{
    reporter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    reason: {
      type: String,
      enum: [
        'spam', 'harassment', 'hate_speech', 'violence', 'nudity',
        'fake_news', 'copyright', 'impersonation', 'underage',
        'self_harm', 'terrorism', 'other'
      ],
      required: true
    },
    description: String,
    reportedAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true
});

reelSchema.index({ author: 1, createdAt: -1 });
reelSchema.index({ createdAt: -1 });
reelSchema.index({ 'location.city': 1 });
reelSchema.index({ 'location.district': 1 });
reelSchema.index({ language: 1 });
reelSchema.index({ hashtags: 1 });
reelSchema.index({ finalScore: -1 });
reelSchema.index({ isDeleted: 1, isArchived: 1 });
reelSchema.index({ visibility: 1 });
reelSchema.index({ 'likes.user': 1 });
reelSchema.index({ 'saves.user': 1 });
reelSchema.index({ 'views.user': 1 });
reelSchema.index({ 'comments.author': 1, createdAt: -1 });



reelSchema.methods.calculateEngagementScore = function() {
  const likesWeight = 1;
  const commentsWeight = 3;
  const sharesWeight = 5;
  const savesWeight = 2;
  const viewsWeight = 0.1;
  
  const score = (this.likes.length * likesWeight) +
                (this.comments.length * commentsWeight) +
                (this.shares.length * sharesWeight) +
                (this.saves.length * savesWeight) +
                (this.views.length * viewsWeight);
  
  this.engagementScore = score;
  return score;
};

reelSchema.methods.calculateLocalScore = function(userLocation) {
  if (!this.location || !userLocation) return 0;
  
  let score = 0;
  
  if (this.location.city === userLocation.city) {
    score = 10;
  }
  else if (this.location.district === userLocation.district) {
    score = 5;
  }
  else if (this.location.province === userLocation.province) {
    score = 2;
  }
  
  this.localScore = score;
  return score;
};

reelSchema.methods.calculateLanguageScore = function(userLanguagePref) {
  if (userLanguagePref === 'both') return 1;
  if (this.language === userLanguagePref) return 1;
  return 0.5;
};

reelSchema.methods.calculateRelationshipScore = function(userId, userFollowing) {
  if (this.author.toString() === userId.toString()) return 2; 

  if (userFollowing.some(id => id.equals(this.author))) {
    return 1;
  }

  return 0.3;
};

reelSchema.methods.calculateFinalScore = function(userLocation, userLanguagePref, userId, userFollowing) {
  const engagementScore = this.calculateEngagementScore();
  const localScore = this.calculateLocalScore(userLocation);
  const languageScore = this.calculateLanguageScore(userLanguagePref);
  const relationshipScore = this.calculateRelationshipScore(userId, userFollowing);
  
  const finalScore = (0.25 * engagementScore) + 
                    (0.35 * localScore) + 
                    (0.2 * languageScore) + 
                    (0.15 * relationshipScore) +
                    (0.05 * 1.2); 
  
  this.finalScore = finalScore;
  return finalScore;
};

reelSchema.methods.addView = function(userId) {
  if (!this.views.some(view => view.user.toString() === userId.toString())) {
    this.views.push({ user: userId });
    this.viewsCount += 1;
    return true;
  }
  return false;
};

reelSchema.methods.addLike = function(userId) {
  const existingLike = this.likes.find(like => like.user.toString() === userId.toString());

  if (existingLike) {
    this.likes.pull(existingLike._id);
    this.likesCount = Math.max(0, this.likesCount - 1);
    return false; 
  } else {
    this.likes.push({ user: userId });
    this.likesCount += 1;
    return true; 
  }
};

reelSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    author: userId,
    content
  });
  this.commentsCount += 1;
  return this.comments[this.comments.length - 1];
};

reelSchema.methods.addShare = function(userId) {
  this.shares.push({ user: userId });
  this.sharesCount += 1;
  return true;
};

reelSchema.methods.addSave = function(userId) {
  const existingSave = this.saves.find(save => save.user.toString() === userId.toString());

  if (existingSave) {
    this.saves.pull(existingSave._id);
    this.savesCount = Math.max(0, this.savesCount - 1);
    return false; 
  } else {
    this.saves.push({ user: userId });
    this.savesCount += 1;
    return true; 
  }
};

module.exports = mongoose.model('Reel', reelSchema);
