const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const Order = require('../../models/Order');
const Review = require('../../models/Review');
const Ticket = require('../../models/Ticket');
const { getClientProfile } = require('../../services/userService');
const { infoEmbed } = require('../../utils/embedFactory');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('client-history')
    .setDescription('Review a client profile snapshot.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) => option.setName('client').setDescription('Client to inspect.').setRequired(true)),
  async execute(client, interaction) {
    const user = interaction.options.getUser('client', true);
    const profile = await getClientProfile(interaction.guildId, user.id);
    const [orders, tickets, reviews, recentOrders] = await Promise.all([
      Order.countDocuments({ guildId: interaction.guildId, customerId: user.id }),
      Ticket.countDocuments({ guildId: interaction.guildId, userId: user.id }),
      Review.countDocuments({ guildId: interaction.guildId, userId: user.id }),
      Order.find({ guildId: interaction.guildId, customerId: user.id }).sort({ updatedAt: -1 }).limit(3)
    ]);

    await interaction.reply({
      embeds: [
        infoEmbed(`Client History • ${user.username}`, 'Private concierge profile snapshot.')
          .addFields(
            { name: 'Orders', value: String(orders), inline: true },
            { name: 'Support Tickets', value: String(tickets), inline: true },
            { name: 'Reviews', value: String(reviews), inline: true },
            { name: 'Payment Preference', value: profile?.paymentPreference || 'Not set', inline: true },
            { name: 'Region', value: profile?.region || 'Not set', inline: true },
            { name: 'VIP Status', value: profile?.vip ? 'VIP Client' : 'Standard Client', inline: true },
            {
              name: 'Recent Order Statuses',
              value: recentOrders.length
                ? recentOrders.map((order) => `• ${order.orderId} • ${order.status}`).join('\n')
                : 'No recent order history.'
            }
          )
      ],
      ephemeral: true
    });
  }
};
