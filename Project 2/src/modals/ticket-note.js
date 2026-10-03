const { addTicketNote } = require('../services/ticketService');
const { successEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'ticket-note:',
  staffOnly: true,
  async execute(client, interaction) {
    const ticketId = interaction.customId.split(':')[1];
    await addTicketNote({
      guildId: interaction.guildId,
      ticketId,
      actorId: interaction.user.id,
      content: interaction.fields.getTextInputValue('note')
    });

    await interaction.reply({
      embeds: [successEmbed('Note Added', `An internal note has been attached to ${ticketId}.`)],
      ephemeral: true
    });
  }
};
