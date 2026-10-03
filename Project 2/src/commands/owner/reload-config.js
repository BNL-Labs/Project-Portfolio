const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { refreshGuildSettings } = require('../../services/settingsService');
const { successEmbed } = require('../../utils/embedFactory');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('reload-config')
    .setDescription('Refresh the cached Luxénza guild configuration.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(client, interaction) {
    await refreshGuildSettings(interaction.guildId);

    await interaction.reply({
      embeds: [successEmbed('Configuration Reloaded', 'The latest server configuration has been refreshed.')],
      ephemeral: true
    });
  }
};
