const { announcementEmbed, successEmbed } = require('../utils/embedFactory');

module.exports = {
  prefix: 'announce:create:',
  staffOnly: true,
  async execute(client, interaction) {
    const [, , type, channelId] = interaction.customId.split(':');
    const channel =
      interaction.guild.channels.cache.get(channelId) || (await interaction.guild.channels.fetch(channelId).catch(() => null));

    if (!channel?.isTextBased()) {
      throw new Error('Target announcement channel could not be found.');
    }

    const typeLabel = type.replace(/_/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
    await channel.send({
      embeds: [
        announcementEmbed({
          type: typeLabel,
          title: interaction.fields.getTextInputValue('title'),
          subtitle: interaction.fields.getTextInputValue('subtitle'),
          description: interaction.fields.getTextInputValue('description'),
          ctaText: interaction.fields.getTextInputValue('ctaText'),
          imageUrl: interaction.fields.getTextInputValue('imageUrl')
        })
      ]
    });

    await interaction.reply({
      embeds: [successEmbed('Announcement Published', `Your ${typeLabel.toLowerCase()} announcement has been published.`)],
      ephemeral: true
    });
  }
};
