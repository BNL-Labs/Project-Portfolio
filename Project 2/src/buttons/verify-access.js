const { upsertUserProfile } = require('../services/userService');
const { successEmbed, infoEmbed } = require('../utils/embedFactory');
const { writeGuildLog } = require('../services/loggingService');

module.exports = {
  customId: 'verify-access',
  async execute(client, interaction, settings) {
    const verifiedRoleId = settings.roleIds?.verifiedMember;

    if (!verifiedRoleId) {
      throw new Error('Verified Member role is not configured.');
    }

    if (interaction.member.roles.cache.has(verifiedRoleId)) {
      await interaction.reply({
        embeds: [infoEmbed('Already Verified', 'Your access is already active. Welcome back to the Luxenza experience.')],
        ephemeral: true
      });
      return;
    }

    await interaction.member.roles.add(verifiedRoleId);

    if (settings.roleIds?.client && !interaction.member.roles.cache.has(settings.roleIds.client)) {
      await interaction.member.roles.add(settings.roleIds.client).catch(() => null);
    }

    await upsertUserProfile(interaction.member);

    if (client.config.verificationWelcomeDm && settings.featureFlags.dmOnVerify) {
      await interaction.user
        .send('Welcome to Luxenza. Your access is verified and your private shopping experience is now open.')
        .catch(() => null);
    }

    await writeGuildLog(
      interaction.guild,
      settings,
      'security',
      'Verification Completed',
      `${interaction.user.tag} verified server access.`,
      [{ name: 'Member', value: `<@${interaction.user.id}>`, inline: true }]
    );

    await interaction.reply({
      embeds: [successEmbed('Access Verified', 'Your private access is now active. Thank you for choosing Luxenza.')],
      ephemeral: true
    });
  }
};
