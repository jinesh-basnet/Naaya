const mongoose = require('mongoose');

const blockSchema = new mongoose.Schema({
    blocker: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    blocked: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    reason: { type: String, maxlength: 500, default: '' },
    category: { type: String, enum: ['spam', 'harassment', 'inappropriate', 'impersonation', 'other', 'none'], default: 'none' },
    isActive: { type: Boolean, default: true, index: true },
    isMutual: { type: Boolean, default: false },
    unblockCount: { type: Number, default: 0 },
    lastUnblockedAt: { type: Date },
    metadata: {
        reportId: { type: mongoose.Schema.Types.ObjectId, ref: 'Report' },
        blockedFromContext: { type: String, enum: ['profile', 'post', 'comment', 'message', 'story', 'reel', 'search', 'other'], default: 'other' },
        deviceInfo: { type: String }
    }
}, { timestamps: true });

blockSchema.index({ blocker: 1, blocked: 1, isActive: 1 }, { unique: true });
blockSchema.index({ blocker: 1, isActive: 1 });
blockSchema.index({ blocked: 1, isActive: 1 });

blockSchema.statics.isBlocked = async function(blockerId, blockedId) {
    if (!blockerId || !blockedId) return false;
    return !!(await this.findOne({ blocker: blockerId, blocked: blockedId, isActive: true }));
};

blockSchema.statics.areBlocked = async function(userId1, userId2) {
    if (!userId1 || !userId2) return false;
    return !!(await this.findOne({
        $or: [{ blocker: userId1, blocked: userId2, isActive: true }, { blocker: userId2, blocked: userId1, isActive: true }]
    }));
};

blockSchema.statics.getBlockStatus = async function(userId1, userId2) {
    if (!userId1 || !userId2) return { isBlocked: false, hasBlockedMe: false, areBlocked: false, isMutual: false };
    const blocks = await this.find({
        $or: [{ blocker: userId1, blocked: userId2, isActive: true }, { blocker: userId2, blocked: userId1, isActive: true }]
    });
    const isBlocked = blocks.some(b => b.blocker.toString() === userId1.toString());
    const hasBlockedMe = blocks.some(b => b.blocker.toString() === userId2.toString());
    return { isBlocked, hasBlockedMe, areBlocked: isBlocked || hasBlockedMe, isMutual: isBlocked && hasBlockedMe };
};

blockSchema.statics.filterBlockedUsers = async function(userId, userIds) {
    if (!userId || !userIds?.length) return userIds;
    const blocks = await this.find({
        $or: [
            { blocker: userId, blocked: { $in: userIds }, isActive: true },
            { blocker: { $in: userIds }, blocked: userId, isActive: true }
        ]
    }).select('blocker blocked');
    const blockedIds = new Set(blocks.map(b => b.blocker.toString() === userId.toString() ? b.blocked.toString() : b.blocker.toString()));
    return userIds.filter(id => !blockedIds.has(id.toString()));
};

blockSchema.statics.getBlockedUserIds = async function(userId) {
    if (!userId) return [];
    return (await this.find({ blocker: userId, isActive: true }).select('blocked')).map(b => b.blocked);
};

blockSchema.statics.getBlockerUserIds = async function(userId) {
    if (!userId) return [];
    return (await this.find({ blocked: userId, isActive: true }).select('blocker')).map(b => b.blocker);
};

blockSchema.statics.getBlockStats = async function(userId) {
    if (!userId) return null;
    const [blockedCount, blockedByCount, mutualCount, categoryStats] = await Promise.all([
        this.countDocuments({ blocker: userId, isActive: true }),
        this.countDocuments({ blocked: userId, isActive: true }),
        this.countDocuments({ blocker: userId, isActive: true, isMutual: true }),
        this.aggregate([{ $match: { blocker: userId, isActive: true } }, { $group: { _id: '$category', count: { $sum: 1 } } }])
    ]);
    return { blockedCount, blockedByCount, mutualCount, categoryBreakdown: categoryStats.reduce((acc, s) => (acc[s._id] = s.count, acc), {}) };
};

blockSchema.statics.bulkCheckBlocked = async function(userId, targetUserIds) {
    if (!userId || !targetUserIds?.length) return {};
    const blocks = await this.find({
        $or: [
            { blocker: userId, blocked: { $in: targetUserIds }, isActive: true },
            { blocker: { $in: targetUserIds }, blocked: userId, isActive: true }
        ]
    }).select('blocker blocked');
    const result = Object.fromEntries(targetUserIds.map(id => [id.toString(), { isBlocked: false, hasBlockedMe: false }]));
    blocks.forEach(b => {
        const [blkId, bkdId] = [b.blocker.toString(), b.blocked.toString()];
        if (blkId === userId.toString()) result[bkdId].isBlocked = true;
        else result[blkId].hasBlockedMe = true;
    });
    return result;
};

blockSchema.methods.softDelete = async function() {
    this.isActive = false;
    this.unblockCount += 1;
    this.lastUnblockedAt = new Date();
    return this.save();
};

blockSchema.methods.reactivate = async function() {
    this.isActive = true;
    return this.save();
};

blockSchema.pre('save', async function(next) {
    if (this.isNew || (this.isModified('isActive') && this.isActive)) {
        const reverseBlock = await this.constructor.findOne({ 
            blocker: this.blocked, 
            blocked: this.blocker, 
            isActive: true 
        });
        
        this.isMutual = !!reverseBlock;
        
        if (reverseBlock && !reverseBlock.isMutual) {
            reverseBlock.isMutual = true;
            await reverseBlock.save();
        }
    }
    next();
});

blockSchema.pre('deleteOne', { document: true, query: false }, async function() {
    if (this.isMutual) {
        await this.constructor.findOneAndUpdate(
            { blocker: this.blocked, blocked: this.blocker, isMutual: true },
            { isMutual: false }
        );
    }
});

module.exports = mongoose.model('Block', blockSchema);

