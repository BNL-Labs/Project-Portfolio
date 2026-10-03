const { addOrderNote } = require('../services/orderService');
const { successEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'order-note:',
  staffOnly: true,
  async execute(client, interaction) {
    const orderId = interaction.customId.split(':')[1];
    await addOrderNote(interaction.guildId, orderId, interaction.user.id, interaction.fields.getTextInputValue('note'));

    await interaction.reply({
      embeds: [successEmbed('Note Added', `An internal note has been attached to ${orderId}.`)],
      ephemeral: true
    });
  }
};
