const { SlashCommandBuilder } = require('discord.js');

const { isStaffMember } = require('../../middleware/accessControl');
const { humanTimestamp, infoEmbed } = require('../../utils/embedFactory');
const { getOrderForViewer } = require('../../services/orderService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('order-status')
    .setDescription('Check the current status of your Luxénza order.')
    .addStringOption((option) =>
      option.setName('order_id').setDescription('Your order ID, for example LX-1001.').setRequired(true)
    ),
  async execute(client, interaction, settings) {
    const orderId = interaction.options.getString('order_id', true).toUpperCase();
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
        infoEmbed(`Order ${order.orderId}`, 'Current concierge status.')
          .addFields(
            { name: 'Status', value: order.status, inline: true },
            { name: 'Assigned Specialist', value: order.assignedStaffId ? `<@${order.assignedStaffId}>` : 'Pending', inline: true },
            { name: 'Created', value: humanTimestamp(order.createdAt), inline: true },
            { name: 'Updated', value: humanTimestamp(order.updatedAt), inline: true },
            { name: 'Payment Verified', value: order.paymentVerifiedAt ? humanTimestamp(order.paymentVerifiedAt) : 'Pending', inline: false }
          )
      ],
      ephemeral: true
    });
  }
};
