import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';

export default {
  data: new SlashCommandBuilder()
    .setName('order')
    .setDescription('Passer une commande de Kamas')
    .addStringOption(option =>
      option.setName('serveur')
        .setDescription('Le serveur sur lequel vous jouez')
        .setRequired(true))
    .addIntegerOption(option =>
      option.setName('quantite')
        .setDescription('Quantité de Kamas')
        .setRequired(true))
    .addStringOption(option =>
      option.setName('paiement')
        .setDescription('Méthode de paiement')
        .setRequired(true)),

  async execute(interaction) {
    const serveur = interaction.options.getString('serveur');
    const quantite = interaction.options.getInteger('quantite');
    const paiement = interaction.options.getString('paiement');

    const order = {
      user: interaction.user.tag,
      id: interaction.user.id,
      serveur,
      quantite,
      paiement,
      date: new Date().toISOString()
    };

    // 📁 Save order to file
    const ordersFile = './orders.json';
    let orders = [];

    try {
      if (fs.existsSync(ordersFile)) {
        const data = fs.readFileSync(ordersFile);
        orders = JSON.parse(data);
      }
      orders.push(order);
      fs.writeFileSync(ordersFile, JSON.stringify(orders, null, 2));
    } catch (error) {
      console.error('Erreur en enregistrant la commande:', error);
      return interaction.reply({ content: '❌ Erreur lors de l\'enregistrement.', ephemeral: true });
    }

    // 🎫 Create ticket channel
    const guild = interaction.guild;
    const user = interaction.user;
    const channelName = `ticket-${user.username.toLowerCase()}`;
    const supportRoleId = 'YOUR_SUPPORT_ROLE_ID'; // Replace this!

    try {
      const ticketChannel = await guild.channels.create({
        name: channelName,
        type: 0, // Text channel
        permissionOverwrites: [
          {
            id: guild.roles.everyone,
            deny: ['ViewChannel']
          },
          {
            id: user.id,
            allow: ['ViewChannel', 'SendMessages']
          },
          {
            id: supportRoleId,
            allow: ['ViewChannel', 'SendMessages']
          },
          {
            id: interaction.client.user.id,  // <-- add this line to allow the bot itself
            allow: ['ViewChannel', 'SendMessages', 'ManageMessages'],
          },
        ]
      });

      await ticketChannel.send({
        content: `🎫 Ticket ouvert pour **${user.username}**\n\nCommande:\n> 💰 **${quantite.toLocaleString()} Kamas**\n> 🗺️ Serveur: **${serveur}**\n> 💳 Paiement: **${paiement}**\n\nUn membre du support va vous répondre bientôt.`
      });

      await interaction.reply({
        content: `✅ Votre commande a été reçue ! Un salon privé <#${ticketChannel.id}> a été créé.`,
        ephemeral: true
      });
    } catch (err) {
      console.error('❌ Erreur lors de la création du ticket :', err);
      await interaction.reply({ content: '❌ Impossible de créer un ticket.', ephemeral: true });
    }
  }
};
