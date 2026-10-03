import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('orderpanel')
    .setDescription('Affiche le panneau de commande avec bouton'),

  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setTitle('💸 Commander des Kamas')
      .setDescription('Cliquez sur le bouton ci-dessous pour commencer votre commande.')
      .setColor(0x00AE86);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId('start_order')
        .setLabel('📦 Commander')
        .setStyle(ButtonStyle.Primary)
    );

    await interaction.reply({ embeds: [embed], components: [row] });
  },
};