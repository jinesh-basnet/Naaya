const mongoose = require('mongoose');

const followersSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true,
    unique: true
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true
  }]
}, {
  timestamps: true
});

followersSchema.index({ 'followers': 1 });

module.exports = mongoose.model('Followers', followersSchema);
