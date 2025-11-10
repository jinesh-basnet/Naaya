const UserInteraction = require('../models/UserInteraction');

const updateInteractionHistory = async (userId, targetUserId, interactionType, contentType, language, tags) => {
  try {
    let interaction = await UserInteraction.findOne({
      viewer: userId,
      author: targetUserId
    });

    if (!interaction) {
      interaction = new UserInteraction({
        viewer: userId,
        author: targetUserId,
        interactions: {
          like: { count: 0, lastInteraction: null },
          comment: { count: 0, lastInteraction: null },
          share: { count: 0, lastInteraction: null },
          save: { count: 0, lastInteraction: null },
          view: { count: 0, lastInteraction: null }
        },
        contentTypeInteractions: {
          image: { count: 0, lastInteraction: null },
          video: { count: 0, lastInteraction: null },
          text: { count: 0, lastInteraction: null }
        },
        languageInteractions: {
          nepali: { count: 0, lastInteraction: null },
          english: { count: 0, lastInteraction: null },
          mixed: { count: 0, lastInteraction: null }
        },
        tagInteractions: [],
        totalInteractions: 0,
        lastInteraction: new Date()
      });
    }

    const now = new Date();

    if (interaction.interactions[interactionType]) {
      interaction.interactions[interactionType].count += 1;
      interaction.interactions[interactionType].lastInteraction = now;
    }

    if (contentType && interaction.contentTypeInteractions[contentType]) {
      interaction.contentTypeInteractions[contentType].count += 1;
      interaction.contentTypeInteractions[contentType].lastInteraction = now;
    }

    if (language && interaction.languageInteractions[language]) {
      interaction.languageInteractions[language].count += 1;
      interaction.languageInteractions[language].lastInteraction = now;
    }

    if (tags && tags.length > 0) {
      tags.forEach(tag => {
        const existingTag = interaction.tagInteractions.find(t => t.tag === tag);
        if (existingTag) {
          existingTag.count += 1;
          existingTag.lastInteraction = now;
        } else {
          interaction.tagInteractions.push({
            tag,
            count: 1,
            lastInteraction: now
          });
        }
      });
    }

    interaction.totalInteractions += 1;
    interaction.lastInteraction = now;

    await interaction.save();
  } catch (error) {
    console.error('Error updating interaction history:', error);
    throw error;
  }
};

module.exports = {
  updateInteractionHistory
};
