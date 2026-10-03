const { submitReview } = require('../services/reviewService');
const { successEmbed } = require('../utils/embedFactory');

module.exports = {
  customId: 'review-create',
  async execute(client, interaction, settings) {
    const rating = Number.parseInt(interaction.fields.getTextInputValue('rating'), 10);
    const recommend = /^y(es)?$/i.test(interaction.fields.getTextInputValue('recommend'));
    const review = await submitReview({
      guild: interaction.guild,
      member: interaction.member,
      settings,
      payload: {
        orderId: interaction.fields.getTextInputValue('orderId').toUpperCase(),
        rating,
        recommend,
        reviewText: interaction.fields.getTextInputValue('reviewText')
      }
    });

    await interaction.reply({
      embeds: [successEmbed('Review Recorded', `Your review has been recorded successfully for ${review.orderId}.`)],
      ephemeral: true
    });
  }
};
