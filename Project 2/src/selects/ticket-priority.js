const { setTicketPriority } = require('../services/ticketService');
const { successEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'ticket-priority:',
  staffOnly: true,
  async execute(client, interaction, settings) {
    const ticketId = interaction.customId.split(':')[1];
    const priority = interaction.values[0];
    const ticket = await setTicketPriority({
      guild: interaction.guild,
      settings,
      ticketId,
      actorId: interaction.user.id,
      priority
    });

    await interaction.reply({
      embeds: [successEmbed('Priority Updated', `${ticket.ticketId} priority is now ${priority}.`)],
      ephemeral: true
    });
  }
};
