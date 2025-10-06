router.post('/:reelId/save', authenticateToken, async (req, res) => {
  try {
    const { reelId } = req.params;
    const userId = req.user._id;

    const reel = await Reel.findById(reelId);
    if (!reel) {
      return res.status(404).json({
        message: 'Reel not found',
        code: 'REEL_NOT_FOUND'
      });
    }

    const existingSaveIndex = reel.saves.findIndex(save => save.user.toString() === userId.toString());

    let isSaved;
    let message;

    if (existingSaveIndex > -1) {
      reel.saves.splice(existingSaveIndex, 1);
      isSaved = false;
      message = 'Reel unsaved successfully';
    } else {
      reel.saves.push({
        user: userId,
        savedAt: new Date()
      });
      isSaved = true;
      message = 'Reel saved successfully';
    }

    await reel.save();

    res.json({
      message,
      isSaved,
      savesCount: reel.saves.length
    });

  } catch (error) {
    console.error('Save/unsave reel error:', error);
    res.status(500).json({
      message: 'Server error saving/unsaving reel',
      code: 'SAVE_REEL_ERROR'
    });
  }
});

router.get('/saved', authenticateToken, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const userId = req.user._id;

    const savedReels = await Reel.aggregate([
      {
        $match: {
          'saves.user': userId,
          isDeleted: false,
          isArchived: false,
          'video.url': { $exists: true, $ne: '' }
        }
      },
      {
        $addFields: {
          userSave: {
            $arrayElemAt: [
              {
                $filter: {
                  input: '$saves',
                  cond: { $eq: ['$$this.user', userId] }
                }
              },
              0
            ]
          }
        }
      },
      {
        $sort: { 'userSave.savedAt': -1 }
      },
      {
        $skip: (page - 1) * limit
      },
      {
        $limit: limit * 1
      },
      {
        $lookup: {
          from: 'users',
          localField: 'author',
          foreignField: '_id',
          as: 'author'
        }
      },
      {
        $unwind: '$author'
      },
      {
        $project: {
          'author.password': 0,
          'author.email': 0,
          'author.emailVerified': 0,
          'author.verificationToken': 0,
          'author.resetPasswordToken': 0,
          'author.resetPasswordExpires': 0,
          'author.twoFactorSecret': 0,
          'author.twoFactorEnabled': 0,
          'author.loginAttempts': 0,
          'author.lockUntil': 0,
          'author.createdAt': 0,
          'author.updatedAt': 0
        }
      }
    ]);

    const finalReels = savedReels.map(reel => ({
      ...reel,
      likesCount: reel.likes.length,
      commentsCount: reel.comments.length,
      sharesCount: reel.shares.length,
      savesCount: reel.saves.length,
      viewsCount: reel.views.length
    }));

    const totalCount = await Reel.countDocuments({
      'saves.user': userId,
      isDeleted: false,
      isArchived: false,
      'video.url': { $exists: true, $ne: '' }
    });

    res.json({
      message: 'Saved reels retrieved successfully',
      reels: finalReels,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });

  } catch (error) {
    console.error('Get saved reels error:', error);
    res.status(500).json({
      message: 'Server error retrieving saved reels',
      code: 'GET_SAVED_REELS_ERROR'
    });
  }
});
