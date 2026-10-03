const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { setFeatureFlag } = require('../../services/settingsService');
const { successEmbed } = require('../../utils/embedFactory');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('unlock-orders')
    .setDescription('Resume new public order submissions.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(client, interaction) {
    await setFeatureFlag(interaction.guildId, 'ordersLocked', false);
    await interaction.reply({
      embeds: [successEmbed('Ordering Unlocked', 'New order creation is available again.')],
      ephemeral: true
    });
  }
};
