import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('confirm')
    .setDescription('Confirmer la commande du client'),

  async execute(interaction) {
    const supportRoleIds = ['YOUR_SUPPORT_ROLE_ID', 'YOUR_SECOND_SUPPORT_ROLE_ID']; // Replace with actual support role ID(s)

    // Check if the user has support role
    const memberRoles = interaction.member.roles.cache;
    const hasSupportRole = supportRoleIds.some(roleId => memberRoles.has(roleId));

    if (!hasSupportRole) {
      return interaction.reply({
        content: '🚫 Vous n’avez pas la permission d’utiliser cette commande.',
        ephemeral: true,
      });
    }

    // Send confirmation message
    try {
      await interaction.channel.send({
        content: `✅ **Commande confirmée !** Merci pour votre achat.\nUn membre du staff vous contactera si nécessaire.`,
      });

      await interaction.reply({
        content: '✔️ Confirmation envoyée avec succès.',
        ephemeral: true,
      });

      // Optional: Close the ticket after confirmation
      // Uncomment one of the following if you want it to auto-close

      // 🔒 Lock the channel
      
      await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
        SendMessages: false
      });
      
      setTimeout(() => {
        interaction.channel.delete().catch(console.error);
      }, 5000);
      

    } catch (error) {
      console.error('❌ Erreur lors de la confirmation :', error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de la confirmation.',
        ephemeral: true,
      });
    }
  }
};
