const {
  ActionRowBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  TextInputBuilder,
  TextInputStyle
} = require('discord.js');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('discount-create')
    .setDescription('Create a discount without broadcasting it yet.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addChannelOption((option) =>
      option.setName('target_channel').setDescription('Channel for future targeting.').setRequired(true)
    )
    .addRoleOption((option) =>
      option.setName('eligible_role').setDescription('Optional eligible role.').setRequired(false)
    ),
  async execute(client, interaction) {
    const targetChannel = interaction.options.getChannel('target_channel', true);
    const eligibleRole = interaction.options.getRole('eligible_role');

    const modal = new ModalBuilder()
      .setCustomId(`discount:create:${targetChannel.id}:${eligibleRole?.id || 'none'}:save:exclusive_drop`)
      .setTitle('Discount Creation')
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
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId('durationText')
            .setLabel('Duration')
            .setRequired(false)
            .setStyle(TextInputStyle.Short)
        )
      );

    await interaction.showModal(modal);
  }
};
