const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const { createPanelEmbed } = require('../utils/embedFactory');

function buildStaffPanel() {
  return {
    embeds: [
      createPanelEmbed({
        title: 'Staff Concierge Hub',
        description: 'Operational controls for open client workflows and premium service visibility.',
        eyebrow: 'Reserved for Luxénza staff leadership.',
        lines: ['Open order overview', 'Pending support queue', 'VIP client visibility']
      })
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('staff-panel:overview_orders').setLabel('Open Orders').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('staff-panel:overview_support').setLabel('Open Support').setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId('staff-panel:pending_payments').setLabel('Pending Payment').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('staff-panel:vip_clients').setLabel('VIP Clients').setStyle(ButtonStyle.Secondary)
      )
    ]
  };
}

module.exports = { buildStaffPanel };
