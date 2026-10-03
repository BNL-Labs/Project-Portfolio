const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { removeFromBlacklist } = require('../../services/blacklistService');
const { successEmbed } = require('../../utils/embedFactory');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('unblacklist')
    .setDescription('Restore access for a blacklisted client.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) => option.setName('client').setDescription('Client to restore.').setRequired(true)),
  async execute(client, interaction) {
    const user = interaction.options.getUser('client', true);
    await removeFromBlacklist(interaction.guildId, user.id);

    await interaction.reply({
      embeds: [successEmbed('Access Restored', `${user} may use concierge requests again.`)],
      ephemeral: true
    });
  }
};
