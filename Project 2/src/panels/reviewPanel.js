const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPanelEmbed } = require('../utils/embedFactory');

function buildReviewPanel() {
  return {
    embeds: [
      createPanelEmbed({
        title: 'Share Your Experience',
        description: 'Your feedback helps us refine the Luxénza client journey.',
        eyebrow: 'Thoughtful reviews may be featured in our testimonials gallery.',
        lines: ['Order-based reviews', 'Featured testimonials', 'First buyer recognition']
      })
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('leave-review').setLabel('Leave a Review').setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

module.exports = { buildReviewPanel };
