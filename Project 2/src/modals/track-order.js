const { isStaffMember } = require('../middleware/accessControl');
const { getOrderForViewer } = require('../services/orderService');
const { humanTimestamp, infoEmbed } = require('../utils/embedFactory');

module.exports = {
  customId: 'track-order-modal',
  async execute(client, interaction, settings) {
    const orderId = interaction.fields.getTextInputValue('orderId').toUpperCase();
    const order = await getOrderForViewer(
      interaction.guildId,
      orderId,
      interaction.user.id,
      isStaffMember(interaction.member, settings)
    );

    if (!order) {
      throw new Error('No order was found for that ID.');
    }

    await interaction.reply({
      embeds: [
        infoEmbed(`Order ${order.orderId}`, 'Current concierge order status.')
          .addFields(
            { name: 'Status', value: order.status, inline: true },
            { name: 'Assigned Specialist', value: order.assignedStaffId ? `<@${order.assignedStaffId}>` : 'Pending', inline: true },
            { name: 'Created', value: humanTimestamp(order.createdAt), inline: true },
            { name: 'Updated', value: humanTimestamp(order.updatedAt), inline: true }
          )
      ],
      ephemeral: true
    });
  }
};
