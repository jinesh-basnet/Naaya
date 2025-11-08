const mongoose = require('mongoose');

const followingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    unique: true
  },
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }]
}, {
  timestamps: true
});

followingSchema.index({ 'following': 1 });

module.exports = mongoose.model('Following', followingSchema);
