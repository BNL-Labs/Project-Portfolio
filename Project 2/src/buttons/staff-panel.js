const User = require('../models/User');
const { getOpenOrderSummary } = require('../services/orderService');
const { getOpenSupportSummary } = require('../services/ticketService');
const { infoEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'staff-panel:',
  staffOnly: true,
  async execute(client, interaction) {
    const action = interaction.customId.split(':')[1];

    if (action === 'overview_orders') {
      const summary = await getOpenOrderSummary(interaction.guildId);
      await interaction.reply({
        embeds: [
          infoEmbed('Open Orders', 'Current private order workload.')
            .addFields(
              { name: 'Open Orders', value: String(summary.openOrders), inline: true },
              { name: 'Awaiting Payment', value: String(summary.awaitingPayment), inline: true },
              { name: 'Flagged Accounts', value: String(summary.flaggedOrders), inline: true }
            )
        ],
        ephemeral: true
      });
      return;
    }

    if (action === 'overview_support') {
      const summary = await getOpenSupportSummary(interaction.guildId);
      await interaction.reply({
        embeds: [
          infoEmbed('Open Support', 'Current aftercare and assistance queue.')
            .addFields(
              { name: 'Open Tickets', value: String(summary.openTickets), inline: true },
              { name: 'VIP Priority', value: String(summary.vipTickets), inline: true }
            )
        ],
        ephemeral: true
      });
      return;
    }

    if (action === 'pending_payments') {
      const summary = await getOpenOrderSummary(interaction.guildId);
      await interaction.reply({
        embeds: [infoEmbed('Pending Payments', `${summary.awaitingPayment} orders are awaiting payment confirmation.`)],
        ephemeral: true
      });
      return;
    }

    const vipClients = await User.find({ guildId: interaction.guildId, vip: true }).sort({ updatedAt: -1 }).limit(10);

    await interaction.reply({
      embeds: [
        infoEmbed(
          'VIP Clients',
          vipClients.length
            ? vipClients.map((clientRecord) => `- <@${clientRecord.userId}>`).join('\n')
            : 'No VIP clients are currently registered.'
        )
      ],
      ephemeral: true
    });
  }
};
