const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createPanelEmbed } = require('../utils/embedFactory');

function buildSupportPanel() {
  return {
    embeds: [
      createPanelEmbed({
        title: 'Support & Aftercare',
        description: 'Select the topic that best matches your request to open a private support lounge.',
        eyebrow: 'VIP clients receive elevated response priority automatically.',
        lines: ['Payment assistance', 'Delivery guidance', 'VIP aftercare']
      })
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('support-type')
          .setPlaceholder('Choose your support request')
          .addOptions(
            { label: 'Payment Issue', value: 'Payment Issue' },
            { label: 'Delivery Question', value: 'Delivery Question' },
            { label: 'Product Inquiry', value: 'Product Inquiry' },
            { label: 'Refund Request', value: 'Refund Request' },
            { label: 'VIP Assistance', value: 'VIP Assistance' },
            { label: 'Other', value: 'Other' }
          )
      )
    ]
  };
}

module.exports = { buildSupportPanel };
