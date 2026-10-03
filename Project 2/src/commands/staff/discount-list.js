const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { infoEmbed } = require('../../utils/embedFactory');
const { listActiveDiscounts } = require('../../services/discountService');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('discount-list')
    .setDescription('List active discount campaigns.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(client, interaction) {
    const discounts = await listActiveDiscounts(interaction.guildId);
    const description = discounts.length
      ? discounts
          .map((discount) => `• \`${discount.discountId}\` • ${discount.title} • ${discount.percent}% • ${discount.status}`)
          .join('\n')
      : 'No active discounts are currently registered.';

    await interaction.reply({
      embeds: [infoEmbed('Active Discounts', description)],
      ephemeral: true
    });
  }
};
