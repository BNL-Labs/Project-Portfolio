const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  customId: 'track-order',
  async execute(client, interaction) {
    const modal = new ModalBuilder()
      .setCustomId('track-order-modal')
      .setTitle('Track Order')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('orderId')
            .setLabel('Order ID')
            .setPlaceholder('LX-1001')
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        )
      );

    await interaction.showModal(modal);
  }
};
