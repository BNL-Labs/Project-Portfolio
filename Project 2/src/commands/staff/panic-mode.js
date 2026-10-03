const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { setFeatureFlag } = require('../../services/settingsService');
const { successEmbed } = require('../../utils/embedFactory');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('panic-mode')
    .setDescription('Toggle security panic mode.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addBooleanOption((option) =>
      option.setName('enabled').setDescription('Enable or disable panic mode.').setRequired(true)
    ),
  async execute(client, interaction) {
    const enabled = interaction.options.getBoolean('enabled', true);
    await setFeatureFlag(interaction.guildId, 'panicMode', enabled);
    await setFeatureFlag(interaction.guildId, 'ordersLocked', enabled);

    await interaction.reply({
      embeds: [
        successEmbed(
          'Panic Mode Updated',
          enabled
            ? 'Security pause is now enabled. New public activity is restricted.'
            : 'Security pause has been lifted. Public order activity may resume.'
        )
      ],
      ephemeral: true
    });
  }
};
