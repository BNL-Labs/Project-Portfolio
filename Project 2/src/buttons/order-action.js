const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const { addOrderNote, closeOrder, updateOrderStatus } = require('../services/orderService');
const { successEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'order-action:',
  staffOnly: true,
  async execute(client, interaction, settings) {
    const [, action, orderId] = interaction.customId.split(':');

    if (action === 'add_note') {
      const modal = new ModalBuilder()
        .setCustomId(`order-note:${orderId}`)
        .setTitle('Internal Order Note')
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

    const order =
      action === 'close'
        ? await closeOrder({ guild: interaction.guild, settings, orderId, actorId: interaction.user.id })
        : await updateOrderStatus({ guild: interaction.guild, settings, orderId, action, actorId: interaction.user.id });

    await interaction.reply({
      embeds: [successEmbed('Order Updated', `${order.orderId} is now marked as ${order.status}.`)],
      ephemeral: true
    });
  }
};
