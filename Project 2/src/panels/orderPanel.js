const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPanelEmbed } = require('../utils/embedFactory');

function buildOrderPanel() {
  return {
    embeds: [
      createPanelEmbed({
        title: 'Private Order Concierge',
        description: 'Begin your order journey below. Each request opens a private lounge reserved for you and our team.',
        eyebrow: 'Public channels remain elegant while your order is handled privately.',
        lines: ['New order placement', 'Custom sourcing requests', 'Bulk client coordination']
      })
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('open-order:new').setLabel('Place New Order').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('open-order:custom').setLabel('Custom Request').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('open-order:bulk').setLabel('Bulk Purchase').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('open-order:ask').setLabel('Ask Before Ordering').setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

module.exports = { buildOrderPanel };
