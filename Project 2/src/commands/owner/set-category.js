const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { CATEGORY_KEYS } = require('../../config/constants');
const { setPathValue } = require('../../services/settingsService');
const { successEmbed } = require('../../utils/embedFactory');

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('set-category')
    .setDescription('Assign the orders or support category.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('target')
        .setDescription('Category slot to update.')
        .setRequired(true)
        .addChoices(...CATEGORY_KEYS.map((item) => ({ name: item.label, value: item.key })))
    )
    .addChannelOption((option) =>
      option
        .setName('category')
        .setDescription('Category channel to assign.')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildCategory)
    ),
  async execute(client, interaction) {
    const target = interaction.options.getString('target', true);
    const category = interaction.options.getChannel('category', true);

    await setPathValue(interaction.guildId, 'categoryIds', target, category.id);

    await interaction.reply({
      embeds: [successEmbed('Category Updated', `${category} is now assigned to \`${target}\`.`)],
      ephemeral: true
    });
  }
};
