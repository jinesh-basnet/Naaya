const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, default: '' },
  category: { type: String, default: 'none' },
  isActive: { type: Boolean, default: true, index: true }
}, { 
  timestamps: true 
});

// Simple unique index
blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

// Statics used by controllers - simplified
blockSchema.statics.isBlocked = async function(blockerId, blockedId) {
  return !!(await this.findOne({ blocker: blockerId, blocked: blockedId, isActive: true }));
};

blockSchema.statics.areBlocked = async function(userId1, userId2) {
  return !!(await this.findOne({
    $or: [
      { blocker: userId1, blocked: userId2, isActive: true },
      { blocker: userId2, blocked: userId1, isActive: true }
    ]
  }));
};

blockSchema.statics.getBlockStatus = async function(userId1, userId2) {
  const blocks = await this.find({
    $or: [
      { blocker: userId1, blocked: userId2, isActive: true },
      { blocker: userId2, blocked: userId1, isActive: true }
    ]
  });
  const isBlocked = blocks.some(b => b.blocker.toString() === userId1.toString());
  const hasBlockedMe = blocks.some(b => b.blocker.toString() === userId2.toString());
  return { isBlocked, hasBlockedMe, areBlocked: isBlocked || hasBlockedMe };
};

blockSchema.statics.getBlockedUserIds = async function(userId) {
  const blocks = await this.find({ blocker: userId, isActive: true }).select('blocked');
  return blocks.map(b => b.blocked);
};

blockSchema.statics.getBlockerUserIds = async function(userId) {
  const blocks = await this.find({ blocked: userId, isActive: true }).select('blocker');
  return blocks.map(b => b.blocker);
};

module.exports = mongoose.model('Block', blockSchema);
