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

// Index for efficient queries
bookmarkCollectionSchema.index({ user: 1, name: 1 });
bookmarkCollectionSchema.index({ user: 1, createdAt: -1 });

// Virtual for post count
bookmarkCollectionSchema.virtual('postCount').get(function() {
  return this.posts.length;
});

// Ensure virtual fields are serialized
bookmarkCollectionSchema.set('toJSON', { virtuals: true });
bookmarkCollectionSchema.set('toObject', { virtuals: true });



// Static method to get user's collections with post counts
bookmarkCollectionSchema.statics.getUserCollections = function(userId) {
  return this.find({ user: userId })
    .populate('posts', '_id content media author createdAt')
    .sort({ createdAt: -1 });
};

module.exports = mongoose.model('BookmarkCollection', bookmarkCollectionSchema);
