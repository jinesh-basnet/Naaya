const mongoose = require('mongoose');

const storyHighlightSchema = new mongoose.Schema({
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true,
    maxlength: 30
  },
  coverStory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  },
  stories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Story',
    required: true
  }],
  isPublic: {
    type: Boolean,
    default: true
  },
  isArchived: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

storyHighlightSchema.index({ author: 1, createdAt: -1 });
storyHighlightSchema.index({ isPublic: 1 });

storyHighlightSchema.virtual('storiesCount').get(function() {
  return this.stories.length;
});

storyHighlightSchema.methods.addStory = function(storyId) {
  if (!this.stories.includes(storyId)) {
    this.stories.push(storyId);
    return true;
  }
  return false;
};

storyHighlightSchema.methods.removeStory = function(storyId) {
  this.stories = this.stories.filter(id => id.toString() !== storyId.toString());
  return true;
};

storyHighlightSchema.statics.getUserHighlights = async function(userId) {
  try {
    return await this.find({ author: userId, isArchived: false })
      .populate('coverStory', 'media')
      .sort({ createdAt: -1 });
  } catch (error) {
    console.error('Error getting user highlights:', error);
    throw error;
  }
};

storyHighlightSchema.statics.createHighlight = async function(highlightData) {
  try {
    const highlight = new this(highlightData);
    await highlight.save();
    return highlight;
  } catch (error) {
    console.error('Error creating highlight:', error);
    throw error;
  }
};

module.exports = mongoose.model('StoryHighlight', storyHighlightSchema);
