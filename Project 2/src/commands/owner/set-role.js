const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { ROLE_KEYS } = require('../../config/constants');
const { setPathValue } = require('../../services/settingsService');
const { successEmbed } = require('../../utils/embedFactory');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('set-role')
    .setDescription('Assign a role mapping for LX Concierge.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('target')
        .setDescription('Role slot to update.')
        .setRequired(true)
        .addChoices(...ROLE_KEYS.map((item) => ({ name: item.label, value: item.key })))
    )
    .addRoleOption((option) =>
      option.setName('role').setDescription('The Discord role to assign.').setRequired(true)
    ),
  async execute(client, interaction) {
    const target = interaction.options.getString('target', true);
    const role = interaction.options.getRole('role', true);

    await setPathValue(interaction.guildId, 'roleIds', target, role.id);

    await interaction.reply({
      embeds: [successEmbed('Role Updated', `${role} is now mapped to \`${target}\`.`)],
      ephemeral: true
    });
  }
};
