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
    .setName('announce')
    .setDescription('Create a premium announcement.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName('type').setDescription('Announcement format.').setRequired(true).addChoices(...typeChoices)
    )
    .addChannelOption((option) =>
      option.setName('target_channel').setDescription('Channel to publish into.').setRequired(true)
    ),
  async execute(client, interaction) {
    const type = interaction.options.getString('type', true);
    const targetChannel = interaction.options.getChannel('target_channel', true);

    const modal = new ModalBuilder()
      .setCustomId(`announce:create:${type}:${targetChannel.id}`)
      .setTitle('Luxénza Announcement')
      .addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId('title').setLabel('Title').setRequired(true).setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('subtitle')
            .setLabel('Subtitle')
            .setRequired(false)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('description')
            .setLabel('Description')
            .setRequired(true)
            .setStyle(TextInputStyle.Paragraph)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('ctaText')
            .setLabel('CTA Text')
            .setRequired(false)
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('imageUrl')
            .setLabel('Image URL')
            .setRequired(false)
            .setStyle(TextInputStyle.Short)
        )
      );

    await interaction.showModal(modal);
  }
};
