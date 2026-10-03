const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  prefix: 'open-order:',
  async execute(client, interaction) {
    const type = interaction.customId.split(':')[1];

    const modal = new ModalBuilder()
      .setCustomId(`order-create:${type}`)
      .setTitle('Private Order Request')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('customerName')
            .setLabel('Client Name / Display Name')
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('productSummary')
            .setLabel('Product / Category')
            .setPlaceholder('Example: Silk set / Womenswear')
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('sizeColorQty')
            .setLabel('Size / Color / Quantity')
            .setPlaceholder('Example: M / Black / 2')
            .setRequired(false)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('paymentRegion')
            .setLabel('Payment / Region')
            .setPlaceholder('Example: PayPal / Morocco')
            .setRequired(false)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('notes')
            .setLabel('Delivery Note / Extra Request')
            .setRequired(false)
            .setStyle(TextInputStyle.Paragraph)
        )
      );

    await interaction.showModal(modal);
  }
};
