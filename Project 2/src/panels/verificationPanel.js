const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPanelEmbed } = require('../utils/embedFactory');

function buildVerificationPanel() {
  return {
    embeds: [
      createPanelEmbed({
        title: 'Private Access Verification',
        description: 'Welcome to Luxénza. Verify your access below to enter our private shopping experience.',
        eyebrow: 'A refined client environment begins with a secure entrance.',
        lines: [
          'Private shopping access',
          'Luxury order support',
          'Curated concierge experience'
        ]
      })
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('verify-access').setLabel('Verify Access').setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

module.exports = { buildVerificationPanel };
