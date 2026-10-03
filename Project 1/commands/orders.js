// commands/orders.js
import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';

export default {
  data: new SlashCommandBuilder()
    .setName('orders')
    .setDescription('Afficher toutes les commandes (admin/support uniquement)'),

  async execute(interaction) {
    // ✅ List all role IDs allowed to manage orders:
    const allowedRoles = [
      'YOUR_ADMIN_ROLE_ID', // Admin
      'YOUR_SUPPORT_ROLE_ID', // Support
      'YOUR_OPTIONAL_ROLE_ID', // Another role (optional)
    ];

    const hasPermission = interaction.member.roles.cache.some(role =>
      allowedRoles.includes(role.id)
    );

    if (!hasPermission) {
      return interaction.reply({
        content: '❌ Vous n\'êtes pas autorisé à utiliser cette commande.',
        ephemeral: true,
      });
    }

    const ordersFile = './orders.json';

    try {
      if (!fs.existsSync(ordersFile)) {
        return interaction.reply({ content: 'Aucune commande trouvée.', ephemeral: true });
      }

      const data = fs.readFileSync(ordersFile);
      const orders = JSON.parse(data);

      if (orders.length === 0) {
        return interaction.reply({ content: 'Aucune commande enregistrée.', ephemeral: true });
      }

      let replyText = '📦 **Liste des commandes :**\n\n';

      for (const order of orders) {
        replyText += `• ${order.user} - ${order.quantite.toLocaleString()} Kamas - Serveur: ${order.serveur} - Paiement: ${order.paiement}\n`;
        if (replyText.length > 1900) break;
      }

      await interaction.reply({ content: replyText, ephemeral: true });

    } catch (err) {
      console.error('Erreur en lisant les commandes:', err);
      await interaction.reply({ content: '❌ Impossible de lire les commandes.', ephemeral: true });
    }
  }
};
