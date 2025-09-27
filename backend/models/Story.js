const mongoose = require('mongoose');

const storySchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    maxlength: 500,
    default: ''
  },
  media: {
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
  },
  background: {
    type: String,
    enum: ['solid', 'gradient', 'image'],
    default: 'solid'
  },
  backgroundColor: String,
  backgroundImage: String,
  textColor: {
    type: String,
    default: '#ffffff'
  },
  fontFamily: {
    type: String,
    default: 'Arial'
  },
  fontSize: {
    type: Number,
    default: 16
  },
  textPosition: {
    x: Number,
    y: Number
  },
  stickers: [{
    type: {
      type: String,
      enum: ['emoji', 'custom', 'nepali']
    },
    content: String,
    position: {
      x: Number,
      y: Number
    },
    size: Number,
    rotation: Number
  }],
  music: {
    title: String,
    artist: String,
    url: String,
    startTime: Number,
    duration: Number
  },
  poll: {
    question: String,
    options: [String],
    votes: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      option: Number,
      votedAt: {
        type: Date,
        default: Date.now
      }
    }],
    expiresAt: Date
  },
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
    enum: ['public', 'followers', 'close_friends', 'private'],
    default: 'public'
  },
  closeFriends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
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
  reactions: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    type: {
      type: String,
      enum: ['like', 'love', 'laugh', 'wow', 'sad', 'angry']
    },
    reactedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replies: [{
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    content: {
      type: String,
      required: true,
      maxlength: 200
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isArchived: {
    type: Boolean,
    default: false
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
    }
  }
}, {
  timestamps: true
});

// Indexes
storySchema.index({ author: 1, createdAt: -1 });
storySchema.index({ expiresAt: 1 });
storySchema.index({ isDeleted: 1, isArchived: 1 });
storySchema.index({ 'location.city': 1 });
storySchema.index({ language: 1 });
// Subdocument indexes
storySchema.index({ 'views.user': 1 });
storySchema.index({ 'reactions.user': 1 });
storySchema.index({ 'replies.author': 1, createdAt: -1 });

// Virtual for views count
storySchema.virtual('viewsCount').get(function() {
  return this.views.length;
});

// Virtual for reactions count
storySchema.virtual('reactionsCount').get(function() {
  return this.reactions.length;
});

// Virtual for replies count
storySchema.virtual('repliesCount').get(function() {
  return this.replies.length;
});

// Method to check if story is expired
storySchema.methods.isExpired = function() {
  return new Date() > this.expiresAt;
};

// Method to check if user can view story
storySchema.methods.canView = function(userId, userFollowing, userCloseFriends) {
  if (this.isDeleted || this.isArchived || this.isExpired()) {
    return false;
  }
  
  if (this.author.toString() === userId.toString()) {
    return true; // Can always view own stories
  }
  
  switch (this.visibility) {
    case 'public':
      return true;
    case 'followers':
      return userFollowing.includes(this.author);
    case 'close_friends':
      return this.closeFriends.includes(userId);
    case 'private':
      return false;
    default:
      return false;
  }
};

// Method to add view
storySchema.methods.addView = function(userId) {
  if (!this.views.some(view => view.user.toString() === userId.toString())) {
    this.views.push({ user: userId });
    return true;
  }
  return false;
};

// Method to add reaction
storySchema.methods.addReaction = function(userId, reactionType) {
  const existingReaction = this.reactions.find(
    reaction => reaction.user.toString() === userId.toString()
  );
  
  if (existingReaction) {
    existingReaction.type = reactionType;
    existingReaction.reactedAt = new Date();
  } else {
    this.reactions.push({ user: userId, type: reactionType });
  }
  
  return true;
};

// Method to remove reaction
storySchema.methods.removeReaction = function(userId) {
  this.reactions = this.reactions.filter(
    reaction => reaction.user.toString() !== userId.toString()
  );
  return true;
};

// Method to add reply
storySchema.methods.addReply = function(userId, content) {
  this.replies.push({ author: userId, content });
  return true;
};

module.exports = mongoose.model('Story', storySchema);
