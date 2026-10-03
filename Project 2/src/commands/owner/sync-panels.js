const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { syncPanels } = require('../../services/panelService');
const { successEmbed, warningEmbed } = require('../../utils/embedFactory');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('sync-panels')
    .setDescription('Deploy or refresh the concierge panels.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
  async execute(client, interaction, settings) {
    await interaction.deferReply({ ephemeral: true });
    const synced = await syncPanels(interaction.guild, settings);

    await interaction.editReply({
      embeds: [
        synced.length
          ? successEmbed('Panels Synchronized', `Updated panels: ${synced.join(', ')}`)
          : warningEmbed('No Panels Updated', 'No configured panel channels were found to synchronize.')
      ]
    });
  }
};
