const { assertCanProceed, enforceRateLimit } = require('../services/securityService');
const { createOrder } = require('../services/orderService');
const { successEmbed, warningEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'order-create:',
  async execute(client, interaction, settings) {
    const type = interaction.customId.split(':')[1];
    const securityState = await assertCanProceed(interaction.guildId, interaction.user.id, settings, 'order');

    if (!securityState.allowed) {
      await interaction.reply({
        embeds: [warningEmbed('Order Unavailable', securityState.reason)],
        ephemeral: true
      });
      return;
    }

    if (!enforceRateLimit({ guildId: interaction.guildId, userId: interaction.user.id, action: 'order', limit: 2, windowMs: 900000 })) {
      await interaction.reply({
        embeds: [warningEmbed('Please Wait', 'A recent order request is already in progress. Please allow a short moment before trying again.')],
        ephemeral: true
      });
      return;
    }

    const notes = interaction.fields.getTextInputValue('notes');
    const { order, channel } = await createOrder({
      guild: interaction.guild,
      member: interaction.member,
      settings,
      type,
      payload: {
        customerName: interaction.fields.getTextInputValue('customerName'),
        productSummary: interaction.fields.getTextInputValue('productSummary'),
        sizeColorQty: interaction.fields.getTextInputValue('sizeColorQty'),
        paymentRegion: interaction.fields.getTextInputValue('paymentRegion'),
        deliveryNote: notes,
        extraRequest: notes
      }
    });

    await interaction.reply({
      embeds: [successEmbed('Order Lounge Created', `Your private order lounge has been created: ${channel}. Order ID: ${order.orderId}`)],
      ephemeral: true
    });
  }
};
