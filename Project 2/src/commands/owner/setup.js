const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const { infoEmbed } = require('../../utils/embedFactory');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('setup')
    .setDescription('View the LX Concierge setup checklist.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(client, interaction, settings) {
    await interaction.reply({
      embeds: [
        infoEmbed(
          'Luxénza Setup Suite',
          [
            'Configure channel routing with `/set-channel`.',
            'Assign role mapping with `/set-role`.',
            'Assign categories with `/set-category`.',
            'Refresh concierge panels with `/sync-panels`.',
            'Validate readiness with `/system-status`.'
          ].join('\n')
        ).addFields(
          { name: 'Configured Transcript Channel', value: settings.transcriptChannelId || 'Not assigned' },
          { name: 'Orders Locked', value: settings.featureFlags.ordersLocked ? 'Yes' : 'No', inline: true },
          { name: 'Panic Mode', value: settings.featureFlags.panicMode ? 'Enabled' : 'Disabled', inline: true }
        )
      ],
      ephemeral: true
    });
  }
};
