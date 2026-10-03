const {
  ActionRowBuilder,
  ModalBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const { claimTicket, closeTicket } = require('../services/ticketService');
const { successEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'ticket-action:',
  staffOnly: true,
  async execute(client, interaction, settings) {
    const [, action, ticketId] = interaction.customId.split(':');

    if (action === 'priority') {
      await interaction.reply({
        content: 'Select the service priority for this support lounge.',
        components: [
          new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId(`ticket-priority:${ticketId}`)
              .setPlaceholder('Choose priority')
              .addOptions(
                { label: 'normal', value: 'normal' },
                { label: 'priority', value: 'priority' },
                { label: 'VIP priority', value: 'VIP priority' }
              )
          )
        ],
        ephemeral: true
      });
      return;
    }

    if (action === 'add_note') {
      const modal = new ModalBuilder()
        .setCustomId(`ticket-note:${ticketId}`)
        .setTitle('Internal Support Note')
        .addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId('note')
              .setLabel('Internal Staff Note')
              .setRequired(true)
              .setStyle(TextInputStyle.Paragraph)
          )
        );

      await interaction.showModal(modal);
      return;
    }

    const ticket =
      action === 'close'
        ? await closeTicket({ guild: interaction.guild, settings, ticketId, actorId: interaction.user.id })
        : await claimTicket({ guild: interaction.guild, settings, ticketId, actorId: interaction.user.id });

    await interaction.reply({
      embeds: [
        successEmbed(
          action === 'close' ? 'Support Lounge Closed' : 'Support Lounge Claimed',
          `${ticket.ticketId} has been updated successfully.`
        )
      ],
      ephemeral: true
    });
  }
};
