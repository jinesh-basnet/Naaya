const mongoose = require('mongoose');

const userInteractionSchema = new mongoose.Schema({
  viewer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Interaction counts with timestamps for decay
  interactions: {
    like: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    },
    comment: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    },
    share: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    },
    save: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    },
    view: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    }
  },
  // Content type preferences
  contentTypeInteractions: {
    image: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    },
    video: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    },
    text: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    }
  },
  // Language preferences
  languageInteractions: {
    nepali: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    },
    english: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    },
    mixed: {
      count: { type: Number, default: 0 },
      lastInteraction: { type: Date, default: null }
    }
  },
  // Tag/hashtag interactions (array of interacted tags)
  tagInteractions: [{
    tag: { type: String, required: true },
    count: { type: Number, default: 1 },
    lastInteraction: { type: Date, default: Date.now }
  }],
  // Total interaction count for quick access
  totalInteractions: {
    type: Number,
    default: 0
  },
  // Last overall interaction
  lastInteraction: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
userInteractionSchema.index({ viewer: 1, author: 1 }, { unique: true });
userInteractionSchema.index({ viewer: 1, lastInteraction: -1 });
userInteractionSchema.index({ 'tagInteractions.tag': 1 });

// Method to update interaction
userInteractionSchema.methods.updateInteraction = function(interactionType, contentType = null, language = null, tags = []) {
  const now = new Date();

  // Update specific interaction type
  if (this.interactions[interactionType]) {
    this.interactions[interactionType].count += 1;
    this.interactions[interactionType].lastInteraction = now;
  }

  // Update content type if provided
  if (contentType && this.contentTypeInteractions[contentType]) {
    this.contentTypeInteractions[contentType].count += 1;
    this.contentTypeInteractions[contentType].lastInteraction = now;
  }

  // Update language if provided
  if (language && this.languageInteractions[language]) {
    this.languageInteractions[language].count += 1;
    this.languageInteractions[language].lastInteraction = now;
  }

  // Update tags
  if (tags && tags.length > 0) {
    tags.forEach(tag => {
      const existingTag = this.tagInteractions.find(t => t.tag === tag);
      if (existingTag) {
        existingTag.count += 1;
        existingTag.lastInteraction = now;
      } else {
        this.tagInteractions.push({
          tag,
          count: 1,
          lastInteraction: now
        });
      }
    });
  }

  // Update totals
  this.totalInteractions += 1;
  this.lastInteraction = now;

  return this.save();
};

// Method to get decayed interaction score (recent interactions weigh more)
userInteractionSchema.methods.getDecayedScore = function(interactionType, halfLifeDays = 7) {
  const interaction = this.interactions[interactionType];
  if (!interaction || interaction.count === 0) return 0;

  const daysSinceLast = (Date.now() - interaction.lastInteraction) / (1000 * 60 * 60 * 24);
  const decayFactor = Math.pow(0.5, daysSinceLast / halfLifeDays);

  return interaction.count * decayFactor;
};

// Static method to get user interaction preferences
userInteractionSchema.statics.getUserPreferences = async function(viewerId) {
  const interactions = await this.find({ viewer: viewerId });

  const preferences = {
    contentType: { image: 0, video: 0, text: 0 },
    language: { nepali: 0, english: 0, mixed: 0 },
    tags: [],
    totalInteractions: 0
  };

  interactions.forEach(interaction => {
    // Aggregate content type preferences
    Object.keys(interaction.contentTypeInteractions).forEach(type => {
      preferences.contentType[type] += interaction.contentTypeInteractions[type].count;
    });

    // Aggregate language preferences
    Object.keys(interaction.languageInteractions).forEach(lang => {
      preferences.language[lang] += interaction.languageInteractions[lang].count;
    });

    // Aggregate tag preferences
    interaction.tagInteractions.forEach(tagInt => {
      const existing = preferences.tags.find(t => t.tag === tagInt.tag);
      if (existing) {
        existing.count += tagInt.count;
      } else {
        preferences.tags.push({ tag: tagInt.tag, count: tagInt.count });
      }
    });

    preferences.totalInteractions += interaction.totalInteractions;
  });

  // Sort tags by count
  preferences.tags.sort((a, b) => b.count - a.count);

  return preferences;
};

module.exports = mongoose.model('UserInteraction', userInteractionSchema);
