const mongoose = require('mongoose');

const bookmarkCollectionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: 50
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: []
  }],
  reels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel',
    default: []
  }],
  description: {
    type: String,
    maxlength: 200,
    default: ''
  },
  visibility: {
    type: String,
    enum: ['public', 'private'],
    default: 'private'
  },
  coverImage: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Prevent duplicate collection names for the same user
bookmarkCollectionSchema.index({ user: 1, name: 1 }, { unique: true });
bookmarkCollectionSchema.index({ user: 1, createdAt: -1 });

bookmarkCollectionSchema.virtual('itemCount').get(function () {
  return (this.posts?.length || 0) + (this.reels?.length || 0);
});

bookmarkCollectionSchema.virtual('postCount').get(function () {
  return this.posts?.length || 0;
});

bookmarkCollectionSchema.virtual('reelCount').get(function () {
  return this.reels?.length || 0;
});

bookmarkCollectionSchema.statics.getUserCollections = function (userId) {
  return this.find({ user: userId })
    .populate('posts', '_id content media author createdAt')
    .populate('reels', '_id video author createdAt caption')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('BookmarkCollection', bookmarkCollectionSchema);

