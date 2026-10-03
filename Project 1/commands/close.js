import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('Ferme le ticket en cours (supprime le salon)'),

  async execute(interaction) {
    const channel = interaction.channel;

    // Check if channel name starts with "ticket-" (basic validation)
    if (!channel.name.startsWith('ticket-')) {
      return interaction.reply({ content: '❌ Cette commande ne peut être utilisée que dans un salon de ticket.', ephemeral: true });
    }

    // Optionally check if user has permission to close
    // Here, allow either the user who opened the ticket or support role

    const supportRoleId = 'YOUR_SUPPORT_ROLE_ID'; // Replace with your support role ID

    const member = interaction.member;
    const hasSupportRole = member.roles.cache.has(supportRoleId);

    if (channel.permissionOverwrites.cache.has(interaction.user.id) || hasSupportRole) {
      await interaction.reply({ content: '✅ Fermeture du ticket dans 5 secondes...', ephemeral: true });

      setTimeout(async () => {
        try {
          await channel.delete('Ticket fermé');
        } catch (err) {
          console.error('Erreur en supprimant le ticket:', err);
        }
      }, 5000);
    } else {
      await interaction.reply({ content: '❌ Vous n\'avez pas la permission de fermer ce ticket.', ephemeral: true });
    }
  }
};
