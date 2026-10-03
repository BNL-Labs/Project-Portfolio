const { assertCanProceed, enforceRateLimit } = require('../services/securityService');
const { createSupportTicket } = require('../services/ticketService');
const { successEmbed, warningEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'support-create:',
  async execute(client, interaction, settings) {
    const type = decodeURIComponent(interaction.customId.split(':')[1]);
    const securityState = await assertCanProceed(interaction.guildId, interaction.user.id, settings, 'support');

    if (!securityState.allowed) {
      await interaction.reply({
        embeds: [warningEmbed('Support Unavailable', securityState.reason)],
        ephemeral: true
      });
      return;
    }

    if (!enforceRateLimit({ guildId: interaction.guildId, userId: interaction.user.id, action: 'support', limit: 3, windowMs: 900000 })) {
      await interaction.reply({
        embeds: [warningEmbed('Please Wait', 'A recent support request is already being processed. Please wait briefly before opening another lounge.')],
        ephemeral: true
      });
      return;
    }

    const { ticket, channel } = await createSupportTicket({
      guild: interaction.guild,
      member: interaction.member,
      settings,
      type,
      payload: {
        subject: interaction.fields.getTextInputValue('subject'),
        orderReference: interaction.fields.getTextInputValue('orderReference'),
        details: interaction.fields.getTextInputValue('details')
      }
    });

    await interaction.reply({
      embeds: [successEmbed('Support Lounge Created', `Your private support lounge is ready: ${channel}. Ticket ID: ${ticket.ticketId}`)],
      ephemeral: true
    });
  }
};
