const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  customId: 'support-type',
  async execute(client, interaction) {
    const type = interaction.values[0];
    const modal = new ModalBuilder()
      .setCustomId(`support-create:${encodeURIComponent(type)}`)
      .setTitle('Private Support Request')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('subject').setLabel('Subject').setRequired(true).setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('orderReference')
            .setLabel('Order Reference (optional)')
            .setRequired(false)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('details')
            .setLabel('Request Details')
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph)
        )
      );

    await interaction.showModal(modal);
  }
};
