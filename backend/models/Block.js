const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
  blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  blocked: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reason: { type: String, default: '' },
  category: { type: String, default: 'none' },
  isActive: { type: Boolean, default: true, index: true },
  isMutual: { type: Boolean, default: false },
  unblockCount: { type: Number, default: 0 },
  lastUnblockedAt: { type: Date },
  metadata: {
    blockedFromContext: { type: String, default: 'other' },
    deviceInfo: { type: String, default: '' },
    originalBlockDate: { type: Date, default: Date.now }
  }
}, {
  timestamps: true
});

blockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

blockSchema.methods.softDelete = async function () {
  this.isActive = false;
  this.lastUnblockedAt = new Date();
  this.unblockCount += 1;
  return this.save();
};

blockSchema.methods.reactivate = async function () {
  this.isActive = true;
  return this.save();
};

blockSchema.statics.isBlocked = async function (blockerId, blockedId) {
  return !!(await this.findOne({ blocker: blockerId, blocked: blockedId, isActive: true }));
};

blockSchema.statics.areBlocked = async function (userId1, userId2) {
  return !!(await this.findOne({
    $or: [
      { blocker: userId1, blocked: userId2, isActive: true },
      { blocker: userId2, blocked: userId1, isActive: true }
    ]
  }));
};

blockSchema.statics.getBlockStatus = async function (userId1, userId2) {
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

blockSchema.statics.getBlockedUserIds = async function (userId) {
  const blocks = await this.find({ blocker: userId, isActive: true }).select('blocked');
  return blocks.map(b => b.blocked);
};

blockSchema.statics.getBlockerUserIds = async function (userId) {
  const blocks = await this.find({ blocked: userId, isActive: true }).select('blocker');
  return blocks.map(b => b.blocker);
};

blockSchema.statics.getBlockStats = async function (userId) {
  const activeBlocks = await this.countDocuments({ blocker: userId, isActive: true });
  const totalBlocksHistory = await this.countDocuments({ blocker: userId });
  const blockedByCount = await this.countDocuments({ blocked: userId, isActive: true });

  return {
    activeBlocks,
    totalBlocksHistory,
    blockedByCount
  };
};

blockSchema.statics.filterBlockedUsers = async function (userId, userIds) {
  const blockedIds = await this.find({
    blocker: userId,
    blocked: { $in: userIds },
    isActive: true
  }).select('blocked');

  const blockedSet = new Set(blockedIds.map(b => b.blocked.toString()));
  return userIds.filter(id => !blockedSet.has(id.toString()));
};

blockSchema.statics.bulkCheckBlocked = async function (userId, targetUserIds) {
  const blocks = await this.find({
    $or: [
      { blocker: userId, blocked: { $in: targetUserIds }, isActive: true },
      { blocker: { $in: targetUserIds }, blocked: userId, isActive: true }
    ]
  });

  const result = {};
  targetUserIds.forEach(id => {
    const idStr = id.toString();
    const isBlocked = blocks.some(b => b.blocker.toString() === userId.toString() && b.blocked.toString() === idStr);
    const hasBlockedMe = blocks.some(b => b.blocker.toString() === idStr && b.blocked.toString() === userId.toString());
    result[idStr] = { isBlocked, hasBlockedMe, areBlocked: isBlocked || hasBlockedMe };
  });

  return result;
};

module.exports = mongoose.model('Block', blockSchema);

