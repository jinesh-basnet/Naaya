const express = require('express');
const router = express.Router();
const Block = require('../models/Block');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   POST /api/blocks/:userId
// @desc    Block a user
// @access  Private
router.post('/:userId', protect, async (req, res) => {
    try {
        const { userId } = req.params;
        const { reason } = req.body;

        // Can't block yourself
        if (userId === req.user._id.toString()) {
            return res.status(400).json({ message: 'You cannot block yourself' });
        }

        // Check if user exists
        const userToBlock = await User.findById(userId);
        if (!userToBlock) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already blocked
        const existingBlock = await Block.findOne({
            blocker: req.user._id,
            blocked: userId
        });

        if (existingBlock) {
            return res.status(400).json({ message: 'User is already blocked' });
        }

        // Create block
        const block = await Block.create({
            blocker: req.user._id,
            blocked: userId,
            reason: reason || ''
        });

        // Remove any follow relationships
        const Follow = require('../models/Follow');
        await Follow.deleteMany({
            $or: [
                { follower: req.user._id, following: userId },
                { follower: userId, following: req.user._id }
            ]
        });

        // Update follower/following counts
        await User.findByIdAndUpdate(req.user._id, {
            $inc: { followingCount: -1 }
        });
        await User.findByIdAndUpdate(userId, {
            $inc: { followersCount: -1 }
        });

        res.status(201).json({
            message: 'User blocked successfully',
            block
        });
    } catch (error) {
        console.error('Block user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   DELETE /api/blocks/:userId
// @desc    Unblock a user
// @access  Private
router.delete('/:userId', protect, async (req, res) => {
    try {
        const { userId } = req.params;

        const block = await Block.findOneAndDelete({
            blocker: req.user._id,
            blocked: userId
        });

        if (!block) {
            return res.status(404).json({ message: 'Block not found' });
        }

        res.json({ message: 'User unblocked successfully' });
    } catch (error) {
        console.error('Unblock user error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   GET /api/blocks
// @desc    Get list of blocked users
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const skip = (page - 1) * limit;

        const blocks = await Block.find({ blocker: req.user._id })
            .populate('blocked', 'username fullName profilePicture bio isVerified')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit);

        const total = await Block.countDocuments({ blocker: req.user._id });

        res.json({
            blocks: blocks.map(block => ({
                id: block._id,
                user: block.blocked,
                reason: block.reason,
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
});

// @route   GET /api/blocks/check/:userId
// @desc    Check if a user is blocked
// @access  Private
router.get('/check/:userId', protect, async (req, res) => {
    try {
        const { userId } = req.params;

        const isBlocked = await Block.isBlocked(req.user._id, userId);
        const hasBlockedMe = await Block.isBlocked(userId, req.user._id);

        res.json({
            isBlocked,
            hasBlockedMe,
            areBlocked: isBlocked || hasBlockedMe
        });
    } catch (error) {
        console.error('Check block status error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
