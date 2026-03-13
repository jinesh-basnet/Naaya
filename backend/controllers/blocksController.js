const Block = require('../models/Block');
const User = require('../models/User');

exports.blockUser = async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason, category, blockedFromContext } = req.body;

        if (userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot block yourself' });
        }

        const userToBlock = await User.findById(userId);
        if (!userToBlock) {
            return res.status(404).json({ message: 'User not found' });
        }

        const existingBlock = await Block.findOne({
            $or: [
                { blocker: req.user._id, blocked: userId },
                { blocker: req.user._id, blocked: userId, isActive: false }
            ]
        });

        if (existingBlock) {
            if (existingBlock.isActive) {
                return res.status(400).json({ message: 'User is already blocked' });
            }
            existingBlock.isActive = true;
            existingBlock.reason = reason || existingBlock.reason || '';
            existingBlock.category = category || existingBlock.category || 'none';
            if (existingBlock.metadata) {
                existingBlock.metadata.blockedFromContext = blockedFromContext || existingBlock.metadata.blockedFromContext || 'other';
            }
            await existingBlock.save();
            
            return res.status(200).json({
                message: 'User blocked successfully',
                block: existingBlock,
                reactivated: true
            });
        }

        const block = await Block.create({
            blocker: req.user._id,
            blocked: userId,
            reason: reason || '',
            category: category || 'none',
            metadata: {
                blockedFromContext: blockedFromContext || 'other',
                deviceInfo: req.headers['user-agent'] || ''
            }
        });

        const Follow = require('../models/Follow');
        await Follow.deleteMany({
            $or: [
                { follower: req.user._id, following: userId },
                { follower: userId, following: req.user._id }
            ]
        });

        await User.findByIdAndUpdate(req.user._id, {
            $inc: { followingCount: -1 }
        });
        await User.findByIdAndUpdate(userId, {
            $inc: { followersCount: -1 }
        });

        res.status(201).json({
            message: 'User blocked successfully',
            block: {
                id: block._id,
                user: userToBlock,
                reason: block.reason,
                category: block.category,
                isMutual: block.isMutual,
                blockedAt: block.createdAt
            }
        });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.unblockUser = async (req, res) => {
    try {
        const { userId } = req.params;

        const block = await Block.findOne({
            blocker: req.user._id,
            blocked: userId
        });

        if (!block) {
            return res.status(404).json({ message: 'Block not found' });
        }

        if (!block.isActive) {
            return res.status(400).json({ message: 'User is already unblocked' });
        }

        await block.softDelete();

        res.json({ 
            message: 'User unblocked successfully',
            blockId: block._id
        });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.reactivateBlock = async (req, res) => {
    try {
        const { userId } = req.params;

        const block = await Block.findOne({
            blocker: req.user._id,
            blocked: userId,
            isActive: false
        });

        if (!block) {
            return res.status(404).json({ message: 'No inactive block found for this user' });
        }

        await block.reactivate();

        res.json({ 
            message: 'User blocked successfully',
            block
        });
    } catch (error) {
        console.error('Reactivate block error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getBlockedUsers = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;
        const includeInactive = req.query.includeInactive === 'true';

        const query = { blocker: req.user._id };
        if (!includeInactive) {
            query.isActive = true;
        }

        const blocks = await Block.find(query)
            .populate('blocked', 'username fullName profilePicture bio isVerified')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Block.countDocuments({ blocker: req.user._id, ...(includeInactive ? {} : { isActive: true }) });

        res.json({
            blocks: blocks.map(block => ({
                id: block._id,
                user: block.blocked,
                reason: block.reason,
                category: block.category,
                isActive: block.isActive,
                isMutual: block.isMutual,
                unblockCount: block.unblockCount,
                lastUnblockedAt: block.lastUnblockedAt,
                blockedAt: block.createdAt
            })),
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get blocked users error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.checkBlockStatus = async (req, res) => {
    try {
        const { userId } = req.params;

        const blockStatus = await Block.getBlockStatus(req.user._id, userId);

        res.json(blockStatus);
    } catch (error) {
        console.error('Check block status error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getBlockStats = async (req, res) => {
    try {
        const stats = await Block.getBlockStats(req.user._id);
        res.json(stats);
    } catch (error) {
        console.error('Get block stats error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.filterBlockedUsers = async (req, res) => {
    try {
        const { userIds } = req.body;
        
        if (!userIds || !Array.isArray(userIds)) {
            return res.status(400).json({ message: 'userIds array is required' });
        }

        const filteredIds = await Block.filterBlockedUsers(req.user._id, userIds);
        
        res.json({
            originalCount: userIds.length,
            filteredCount: filteredIds.length,
            blockedCount: userIds.length - filteredIds.length,
            userIds: filteredIds
        });
    } catch (error) {
        console.error('Filter blocked users error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.bulkCheckBlocked = async (req, res) => {
    try {
        const { targetUserIds } = req.body;
        
        if (!targetUserIds || !Array.isArray(targetUserIds)) {
            return res.status(400).json({ message: 'targetUserIds array is required' });
        }

        const blockStatuses = await Block.bulkCheckBlocked(req.user._id, targetUserIds);
        
        res.json(blockStatuses);
    } catch (error) {
        console.error('Bulk check blocked error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
