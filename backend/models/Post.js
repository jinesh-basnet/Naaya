const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
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
  replies: [], 
  createdAt: {
    type: Date,
    default: Date.now
  }
});

commentSchema.add({ replies: [commentSchema] });

const postSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    maxlength: 2200,
    default: ''
  },
  media: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    duration: Number, 
    size: Number,
    width: Number,
    height: Number
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
  postType: {
    type: String,
    enum: ['post', 'reel', 'story'],
    default: 'post'
  },
  visibility: {
    type: String,
    enum: ['public', 'followers', 'private'],
    default: 'public'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  mentions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  hashtags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
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
  comments: [commentSchema],
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
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
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
  sharedFrom: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  originalContent: {
    type: String,
    maxlength: 2200,
    default: ''
  },
  originalMedia: [{
    type: {
      type: String,
      enum: ['image', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    thumbnail: String,
    duration: Number, 
    size: Number,
    width: Number,
    height: Number
  }],
  originalAuthor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  originalLocation: {
    name: String,
    coordinates: {
      lat: Number,
      lng: Number
    },
    city: String,
    district: String,
    province: String
  },
  originalCreatedAt: {
    type: Date
  },
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

postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ createdAt: -1 });
postSchema.index({ 'location.city': 1 });
postSchema.index({ 'location.district': 1 });
postSchema.index({ language: 1 });
postSchema.index({ postType: 1 });
postSchema.index({ hashtags: 1 });
postSchema.index({ finalScore: -1 });
postSchema.index({ isDeleted: 1, isArchived: 1 });
postSchema.index({ 'likes.user': 1 });
postSchema.index({ 'saves.user': 1 });
postSchema.index({ 'views.user': 1 });
postSchema.index({ 'comments.author': 1, createdAt: -1 });



postSchema.methods.calculateEngagementScore = function() {
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

postSchema.methods.calculateLocalScore = function(userLocation) {
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

postSchema.methods.calculateLanguageScore = function(userLanguagePref) {
  if (userLanguagePref === 'both') return 1;
  if (this.language === userLanguagePref) return 1;
  return 0.5;
};

postSchema.methods.calculateRelationshipScore = function(userId, userFollowing) {
  if (this.author.toString() === userId.toString()) return 0; 
  
  if (userFollowing.includes(this.author)) {
    return 1; 
  }
  
  return 0.3; 
};

postSchema.methods.calculateFinalScore = function(userLocation, userLanguagePref, userId, userFollowing) {
  const engagementScore = this.calculateEngagementScore();
  const localScore = this.calculateLocalScore(userLocation);
  const languageScore = this.calculateLanguageScore(userLanguagePref);
  const relationshipScore = this.calculateRelationshipScore(userId, userFollowing);

  const finalScore = (0.3 * engagementScore) +
                    (0.4 * localScore) +
                    (0.2 * languageScore) +
                    (0.1 * relationshipScore);

  this.finalScore = finalScore;
  return finalScore;
};

postSchema.methods.addLike = function(userId) {
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

postSchema.methods.addComment = function(userId, content) {
  this.comments.push({
    author: userId,
    content
  });
  this.commentsCount += 1;
  return this.comments[this.comments.length - 1];
};

postSchema.methods.addShare = function(userId) {
  this.shares.push({ user: userId });
  this.sharesCount += 1;
  return true;
};

postSchema.methods.addSave = function(userId) {
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

postSchema.methods.addView = function(userId) {
  if (!this.views.some(view => view.user.toString() === userId.toString())) {
    this.views.push({ user: userId });
    this.viewsCount += 1;
    return true;
  }
  return false;
};

postSchema.set('toJSON', { virtuals: true });
postSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Post', postSchema);
