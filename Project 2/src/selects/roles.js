const { ROLE_CATEGORY_MAP } = require('../config/constants');
const { successEmbed } = require('../utils/embedFactory');
const { writeGuildLog } = require('../services/loggingService');
const { upsertUserProfile } = require('../services/userService');

const profileFieldMap = {
  payment: 'paymentPreference',
  location: 'region',
  preference: 'preference'
};

module.exports = {
  prefix: 'roles:',
  async execute(client, interaction, settings) {
    const category = interaction.customId.split(':')[1];
    const selectedValues = interaction.values.filter((value) => value !== 'clear');
    const selected = selectedValues.length ? selectedValues.join(', ') : 'clear';
    const roleKeys = ROLE_CATEGORY_MAP[category];
    const roleIds = roleKeys.map((key) => settings.roleIds?.[key]).filter(Boolean);

    if (roleIds.length) {
      await interaction.member.roles.remove(roleIds).catch(() => null);
    }

    if (selectedValues.length) {
      const newRoleIds = selectedValues.map((value) => settings.roleIds?.[value]).filter(Boolean);

      if (newRoleIds.length) {
        await interaction.member.roles.add(newRoleIds).catch(() => null);
      }
    }

    await upsertUserProfile(interaction.member, {
      [profileFieldMap[category]]: selected === 'clear' ? null : selected
    });

    await writeGuildLog(interaction.guild, settings, 'roleUpdate', 'Role Preference Updated', `${interaction.user.tag} updated ${category}.`, [
      { name: 'Selection', value: selected, inline: true }
    ]);

    await interaction.reply({
      embeds: [successEmbed('Preference Updated', `Your ${category} preference has been updated successfully.`)],
      ephemeral: true
    });
  }
};
