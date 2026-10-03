const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  customId: 'leave-review',
  async execute(client, interaction) {
    const modal = new ModalBuilder()
      .setCustomId('review-create')
      .setTitle('Client Review')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('orderId').setLabel('Order ID').setRequired(true).setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('rating')
            .setLabel('Rating out of 5')
            .setPlaceholder('5')
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('recommend')
            .setLabel('Recommend us? yes / no')
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('reviewText')
            .setLabel('Your Review')
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph)
        )
      );

    await interaction.showModal(modal);
  }
};
