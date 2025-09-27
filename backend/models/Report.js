const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  reporter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  contentType: {
    type: String,
    enum: ['post', 'comment', 'story', 'user', 'message'],
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  contentAuthor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    enum: [
      'spam',
      'harassment',
      'hate_speech',
      'violence',
      'nudity',
      'fake_news',
      'copyright',
      'impersonation',
      'underage',
      'self_harm',
      'terrorism',
      'other'
    ],
    required: true
  },
  description: {
    type: String,
    maxlength: 1000,
    default: ''
  },
  evidence: [{
    type: {
      type: String,
      enum: ['screenshot', 'url', 'text']
    },
    content: String,
    url: String
  }],
  status: {
    type: String,
    enum: ['pending', 'reviewing', 'resolved', 'dismissed'],
    default: 'pending'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  assignedTo: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  moderatorNotes: [{
    moderator: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    note: {
      type: String,
      required: true,
      maxlength: 500
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  resolution: {
    action: {
      type: String,
      enum: [
        'no_action',
        'content_removed',
        'content_hidden',
        'user_warned',
        'user_suspended',
        'user_banned',
        'account_restricted'
      ]
    },
    reason: String,
    duration: Number, // For suspensions/bans in days
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  appeal: {
    submitted: {
      type: Boolean,
      default: false
    },
    reason: String,
    submittedAt: Date,
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reviewedAt: Date,
    appealStatus: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    }
  },
  // Track if this is a duplicate report
  duplicateOf: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report',
    default: null
  },
  // Track related reports
  relatedReports: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Report'
  }],
  // Auto-escalation based on report count
  reportCount: {
    type: Number,
    default: 1
  },
  escalatedAt: Date,
  // For tracking patterns
  reporterHistory: {
    totalReports: Number,
    resolvedReports: Number,
    falseReports: Number
  }
}, {
  timestamps: true
});

// Indexes for better performance
reportSchema.index({ contentType: 1, contentId: 1 });
reportSchema.index({ reporter: 1, createdAt: -1 });
reportSchema.index({ contentAuthor: 1, createdAt: -1 });
reportSchema.index({ status: 1, priority: 1, createdAt: -1 });
reportSchema.index({ assignedTo: 1, status: 1 });
reportSchema.index({ createdAt: -1 });

// Virtual for time since report
reportSchema.virtual('ageInHours').get(function() {
  return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60));
});

// Static method to create report
reportSchema.statics.createReport = async function(reportData) {
  try {
    // Check for duplicate reports from same user
    const existingReport = await this.findOne({
      reporter: reportData.reporter,
      contentType: reportData.contentType,
      contentId: reportData.contentId,
      status: { $in: ['pending', 'reviewing'] }
    });

    if (existingReport) {
      throw new Error('You have already reported this content');
    }

    // Check for similar reports to link them
    const similarReports = await this.find({
      contentType: reportData.contentType,
      contentId: reportData.contentId,
      status: { $in: ['pending', 'reviewing'] }
    });

    const report = new this(reportData);
    
    // Link to similar reports
    if (similarReports.length > 0) {
      report.relatedReports = similarReports.map(r => r._id);
      // Update report count
      report.reportCount = similarReports.length + 1;
    }

    await report.save();
    await report.populate('reporter', 'username fullName');
    await report.populate('contentAuthor', 'username fullName');

    return report;
  } catch (error) {
    console.error('Error creating report:', error);
    throw error;
  }
};

// Static method to get reports with filters
reportSchema.statics.getReports = async function(filters = {}, page = 1, limit = 20) {
  try {
    const query = { ...filters };
    
    const reports = await this.find(query)
      .populate('reporter', 'username fullName profilePicture')
      .populate('contentAuthor', 'username fullName profilePicture')
      .populate('assignedTo', 'username fullName')
      .sort({ priority: -1, createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await this.countDocuments(query);

    return {
      reports,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
  }
};

// Method to assign report to moderator
reportSchema.methods.assignToModerator = async function(moderatorId) {
  this.assignedTo = moderatorId;
  this.status = 'reviewing';
  await this.save();
  return this;
};

// Method to add moderator note
reportSchema.methods.addModeratorNote = async function(moderatorId, note) {
  this.moderatorNotes.push({
    moderator: moderatorId,
    note
  });
  await this.save();
  return this;
};

// Method to resolve report
reportSchema.methods.resolve = async function(resolution, resolvedBy) {
  this.status = 'resolved';
  this.resolution = {
    ...resolution,
    resolvedBy,
    resolvedAt: new Date()
  };
  await this.save();
  return this;
};

// Method to dismiss report
reportSchema.methods.dismiss = async function(reason, dismissedBy) {
  this.status = 'dismissed';
  this.resolution = {
    action: 'no_action',
    reason,
    resolvedBy: dismissedBy,
    resolvedAt: new Date()
  };
  await this.save();
  return this;
};

// Method to escalate report
reportSchema.methods.escalate = async function() {
  this.priority = 'urgent';
  this.escalatedAt = new Date();
  await this.save();
  return this;
};

module.exports = mongoose.model('Report', reportSchema);
