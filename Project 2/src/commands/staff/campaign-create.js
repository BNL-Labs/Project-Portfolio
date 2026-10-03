const {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

const { ANNOUNCEMENT_TYPES } = require('../../config/constants');

const typeChoices = ANNOUNCEMENT_TYPES.map((type) => ({
  name: type,
  value: type.toLowerCase().replace(/[^a-z0-9]+/g, '_')
}));

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('campaign-create')
    .setDescription('Create and broadcast a branded campaign.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName('type').setDescription('Campaign type.').setRequired(true).addChoices(...typeChoices)
    )
    .addChannelOption((option) =>
      option.setName('target_channel').setDescription('Channel to broadcast into.').setRequired(true)
    )
    .addRoleOption((option) =>
      option.setName('eligible_role').setDescription('Optional role to target.').setRequired(false)
    ),
  async execute(client, interaction) {
    const type = interaction.options.getString('type', true);
    const targetChannel = interaction.options.getChannel('target_channel', true);
    const eligibleRole = interaction.options.getRole('eligible_role');

    const modal = new ModalBuilder()
      .setCustomId(`discount:create:${targetChannel.id}:${eligibleRole?.id || 'none'}:broadcast:${type}`)
      .setTitle('Campaign Creation')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('title').setLabel('Title').setRequired(true).setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('code').setLabel('Code').setRequired(false).setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('percent')
            .setLabel('Percent')
            .setRequired(true)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('15')
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('durationText')
            .setLabel('Duration')
            .setRequired(false)
            .setStyle(TextInputStyle.Short)
            .setPlaceholder('48 hours')
        )
      );

    await interaction.showModal(modal);
  }
};
