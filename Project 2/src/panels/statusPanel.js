const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPanelEmbed } = require('../utils/embedFactory');

function buildStatusPanel() {
  return {
    embeds: [
      createPanelEmbed({
        title: 'Track Your Order',
        description: 'Use the secure tracker below to check the current status of your Luxénza order.',
        eyebrow: 'Only the order owner or authorized staff can view an order timeline.',
        lines: ['Live status visibility', 'Assigned specialist information', 'Key timeline checkpoints']
      })
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('track-order').setLabel('Track My Order').setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

module.exports = { buildStatusPanel };
