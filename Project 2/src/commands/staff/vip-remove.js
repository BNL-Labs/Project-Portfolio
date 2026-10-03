const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { setVipStatus } = require('../../services/userService');
const { successEmbed } = require('../../utils/embedFactory');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('vip-remove')
    .setDescription('Remove VIP status from a client.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption((option) => option.setName('client').setDescription('Client to update.').setRequired(true)),
  async execute(client, interaction, settings) {
    const user = interaction.options.getUser('client', true);
    const member = await interaction.guild.members.fetch(user.id);
    await setVipStatus(interaction.guildId, user.id, false);

    if (settings.roleIds?.vipClient && member.roles.cache.has(settings.roleIds.vipClient)) {
      await member.roles.remove(settings.roleIds.vipClient).catch(() => null);
    }

    await interaction.reply({
      embeds: [successEmbed('VIP Status Removed', `${member} is no longer marked as a VIP client.`)],
      ephemeral: true
    });
  }
};
