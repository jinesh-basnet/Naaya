const UserInteraction = require('../models/UserInteraction');

async function updateInteractionHistory(viewerId, authorId, interactionType, contentType, language, tags) {
  try {
    let interaction = await UserInteraction.findOne({
      viewer: viewerId,
      author: authorId
    });

    if (!interaction) {
      interaction = new UserInteraction({
        viewer: viewerId,
        author: authorId
      });
    }

    await interaction.updateInteraction(interactionType, contentType, language, tags);
  } catch (error) {
    console.error('Error updating interaction history:', error);
    throw error;
  }
}

module.exports = {
  updateInteractionHistory
};
