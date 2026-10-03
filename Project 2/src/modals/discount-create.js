const { broadcastCampaign, createDiscount } = require('../services/discountService');
const { successEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'discount:create:',
  staffOnly: true,
  async execute(client, interaction, settings) {
    const [, , targetChannelId, eligibleRoleId, mode, type] = interaction.customId.split(':');
    const discount = await createDiscount({
      guild: interaction.guild,
      settings,
      actorId: interaction.user.id,
      payload: {
        title: interaction.fields.getTextInputValue('title'),
        description: interaction.fields.getTextInputValue('description'),
        code: interaction.fields.getTextInputValue('code'),
        percent: Number.parseInt(interaction.fields.getTextInputValue('percent'), 10),
        durationText: interaction.fields.getTextInputValue('durationText'),
        targetChannelId,
        eligibleRoleId: eligibleRoleId === 'none' ? null : eligibleRoleId
      }
    });

    if (mode === 'broadcast') {
      await broadcastCampaign({
        guild: interaction.guild,
        discount,
        type: type.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase())
      });
    }

    await interaction.reply({
      embeds: [
        successEmbed(
          mode === 'broadcast' ? 'Campaign Published' : 'Discount Created',
          `${discount.title} is now ${mode === 'broadcast' ? 'live' : 'saved'} under ID ${discount.discountId}.`
        )
      ],
      ephemeral: true
    });
  }
};
