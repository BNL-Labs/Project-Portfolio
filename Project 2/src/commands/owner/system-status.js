const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { CATEGORY_KEYS, CHANNEL_KEYS, ROLE_KEYS } = require('../../config/constants');
const { systemStatusEmbed } = require('../../utils/embedFactory');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('system-status')
    .setDescription('Review the configuration state of LX Concierge.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(client, interaction, settings) {
    const summary = {
      channelsConfigured: CHANNEL_KEYS.filter((item) => settings.channelIds?.[item.key]).length,
      totalChannelsConfigured: CHANNEL_KEYS.length,
      categoriesConfigured: CATEGORY_KEYS.filter((item) => settings.categoryIds?.[item.key]).length,
      totalCategoriesConfigured: CATEGORY_KEYS.length,
      rolesConfigured: ROLE_KEYS.filter((item) => settings.roleIds?.[item.key]).length,
      totalRolesConfigured: ROLE_KEYS.length,
      flags: [
        settings.featureFlags.ordersLocked ? 'Orders locked' : null,
        settings.featureFlags.panicMode ? 'Panic mode enabled' : null,
        settings.featureFlags.preventDuplicateActiveOrders ? 'Duplicate active orders blocked' : null
      ].filter(Boolean)
    };

    await interaction.reply({
      embeds: [systemStatusEmbed(summary)],
      ephemeral: true
    });
  }
};
