const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { addToBlacklist } = require('../../services/blacklistService');
const { successEmbed } = require('../../utils/embedFactory');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Blacklist a user from concierge requests.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) => option.setName('client').setDescription('Client to restrict.').setRequired(true))
    .addStringOption((option) => option.setName('reason').setDescription('Reason for restriction.').setRequired(true)),
  async execute(client, interaction) {
    const user = interaction.options.getUser('client', true);
    const reason = interaction.options.getString('reason', true);
    await addToBlacklist(interaction.guildId, user.id, reason, interaction.user.id);

    await interaction.reply({
      embeds: [successEmbed('Client Blacklisted', `${user} has been restricted from concierge requests.`)],
      ephemeral: true
    });
  }
};
