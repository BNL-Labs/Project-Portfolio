const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { setVipStatus } = require('../../services/userService');
const { successEmbed, warningEmbed } = require('../../utils/embedFactory');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('vip-add')
    .setDescription('Grant VIP status to a client.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) => option.setName('client').setDescription('Client to promote.').setRequired(true)),
  async execute(client, interaction, settings) {
    const user = interaction.options.getUser('client', true);
    const member = await interaction.guild.members.fetch(user.id);
    await setVipStatus(interaction.guildId, user.id, true);

    if (settings.roleIds?.vipClient) {
      await member.roles.add(settings.roleIds.vipClient).catch(() => null);
    }

    await interaction.reply({
      embeds: [
        settings.roleIds?.vipClient
          ? successEmbed('VIP Status Granted', `${member} has been elevated to VIP Client.`)
          : warningEmbed('VIP Saved', `${member} is marked VIP in the database, but no VIP role is configured.`)
      ],
      ephemeral: true
    });
  }
};
