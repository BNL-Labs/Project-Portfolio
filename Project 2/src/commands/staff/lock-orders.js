const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { setFeatureFlag } = require('../../services/settingsService');
const { successEmbed } = require('../../utils/embedFactory');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('lock-orders')
    .setDescription('Pause new public order submissions.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  async execute(client, interaction) {
    await setFeatureFlag(interaction.guildId, 'ordersLocked', true);
    await interaction.reply({
      embeds: [successEmbed('Ordering Locked', 'New order creation is now paused.')],
      ephemeral: true
    });
  }
};
