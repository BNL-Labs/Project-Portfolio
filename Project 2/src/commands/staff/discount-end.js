const { PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { endDiscount } = require('../../services/discountService');
const { successEmbed, warningEmbed } = require('../../utils/embedFactory');

module.exports = {
  staffOnly: true,
  data: new SlashCommandBuilder()
    .setName('discount-end')
    .setDescription('End an active discount campaign.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addStringOption((option) =>
      option.setName('discount_id').setDescription('Discount ID to end.').setRequired(true)
    ),
  async execute(client, interaction) {
    const discount = await endDiscount(interaction.guildId, interaction.options.getString('discount_id', true));

    await interaction.reply({
      embeds: [
        discount
          ? successEmbed('Discount Ended', `${discount.title} has been marked inactive.`)
          : warningEmbed('Not Found', 'No active discount matched that ID.')
      ],
      ephemeral: true
    });
  }
};
