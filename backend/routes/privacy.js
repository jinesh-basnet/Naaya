const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// @route   GET /api/privacy
// @desc    Get current user's privacy settings
// @access  Private
router.get('/', protect, async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('privacySettings');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            privacySettings: user.privacySettings
        });
    } catch (error) {
        console.error('Get privacy settings error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/privacy
// @desc    Update privacy settings
// @access  Private
router.put('/', protect, async (req, res) => {
    try {
        const {
            profileVisibility,
            showOnlineStatus,
            allowMessagesFrom,
            allowCommentsFrom,
            allowTagging,
            allowMentions
        } = req.body;

        const updateData = {};

        if (profileVisibility !== undefined) {
            if (!['public', 'followers', 'private'].includes(profileVisibility)) {
                return res.status(400).json({
                    message: 'Invalid profileVisibility value. Must be: public, followers, or private'
                });
            }
            updateData['privacySettings.profileVisibility'] = profileVisibility;
        }

        if (showOnlineStatus !== undefined) {
            updateData['privacySettings.showOnlineStatus'] = Boolean(showOnlineStatus);
        }

        if (allowMessagesFrom !== undefined) {
            if (!['everyone', 'followers', 'none'].includes(allowMessagesFrom)) {
                return res.status(400).json({
                    message: 'Invalid allowMessagesFrom value. Must be: everyone, followers, or none'
                });
            }
            updateData['privacySettings.allowMessagesFrom'] = allowMessagesFrom;
        }

        if (allowCommentsFrom !== undefined) {
            if (!['everyone', 'followers', 'none'].includes(allowCommentsFrom)) {
                return res.status(400).json({
                    message: 'Invalid allowCommentsFrom value. Must be: everyone, followers, or none'
                });
            }
            updateData['privacySettings.allowCommentsFrom'] = allowCommentsFrom;
        }

        if (allowTagging !== undefined) {
            updateData['privacySettings.allowTagging'] = Boolean(allowTagging);
        }

        if (allowMentions !== undefined) {
            updateData['privacySettings.allowMentions'] = Boolean(allowMentions);
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: updateData },
            { new: true, runValidators: true }
        ).select('privacySettings');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Privacy settings updated successfully',
            privacySettings: user.privacySettings
        });
    } catch (error) {
        console.error('Update privacy settings error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// @route   PUT /api/privacy/comments
// @desc    Update comment privacy setting
// @access  Private
router.put('/comments', protect, async (req, res) => {
    try {
        const { allowCommentsFrom } = req.body;

        if (!allowCommentsFrom || !['everyone', 'followers', 'none'].includes(allowCommentsFrom)) {
            return res.status(400).json({
                message: 'Invalid value. Must be: everyone, followers, or none'
            });
        }

        const user = await User.findByIdAndUpdate(
            req.user._id,
            { $set: { 'privacySettings.allowCommentsFrom': allowCommentsFrom } },
            { new: true, runValidators: true }
        ).select('privacySettings.allowCommentsFrom');

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            message: 'Comment privacy updated successfully',
            allowCommentsFrom: user.privacySettings.allowCommentsFrom
        });
    } catch (error) {
        console.error('Update comment privacy error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

module.exports = router;
