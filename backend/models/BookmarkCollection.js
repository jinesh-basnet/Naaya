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
    ref: 'Post'
  }],
  reels: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reel'
  }],
  description: {
    type: String,
    maxlength: 200,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  coverImage: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

bookmarkCollectionSchema.index({ user: 1, name: 1 });
bookmarkCollectionSchema.index({ user: 1, createdAt: -1 });

bookmarkCollectionSchema.virtual('postCount').get(function () {
  return this.posts.length + (this.reels ? this.reels.length : 0);
});

bookmarkCollectionSchema.virtual('itemCount').get(function () {
  return this.posts.length + (this.reels ? this.reels.length : 0);
});

bookmarkCollectionSchema.set('toJSON', { virtuals: true });
bookmarkCollectionSchema.set('toObject', { virtuals: true });



bookmarkCollectionSchema.statics.getUserCollections = function (userId) {
  return this.find({ user: userId })
    .populate('posts', '_id content media author createdAt')
    .populate('reels', '_id video author createdAt caption')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('BookmarkCollection', bookmarkCollectionSchema);
