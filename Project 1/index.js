import {
  Client,
  GatewayIntentBits,
  Collection,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  InteractionType,
} from 'discord.js';
import { createRequire } from 'module';
import fs from 'fs';

const require = createRequire(import.meta.url);
const config = require('./config.json');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  client.commands.set(command.default.data.name, command.default);
}

client.once('ready', () => {
  console.log(`🤖 Bot is online as ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  // Slash command
  if (interaction.isChatInputCommand()) {
    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
      await command.execute(interaction);
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: '❌ Une erreur est survenue lors de l\'exécution de la commande.',
        ephemeral: true
      });
    }
  }

  // Button clicked
  else if (interaction.isButton()) {
    // Ticket creation button
    if (interaction.customId === 'start_order') {
      const guild = interaction.guild;
      const categoryId = 'YOUR_TICKET_CATEGORY_ID'; // your category

      const channel = await guild.channels.create({
        name: `commande-${interaction.user.username}`,
        type: 0,
        parent: categoryId,
        permissionOverwrites: [
          {
            id: guild.id,
            deny: ['ViewChannel'],
          },
          {
            id: interaction.user.id,
            allow: ['ViewChannel', 'SendMessages'],
          },
          {
            id: 'YOUR_STAFF_ROLE_ID', // staff role
            allow: ['ViewChannel', 'SendMessages'],
          },
          {
            id: interaction.client.user.id,
            allow: ['ViewChannel', 'SendMessages', 'ManageChannels'],
          },
        ],
      });

      const openModalButton = new ButtonBuilder()
        .setCustomId('open_order_modal')
        .setLabel('Fournir les détails de la commande')
        .setStyle(ButtonStyle.Primary);

      const buttonRow = new ActionRowBuilder().addComponents(openModalButton);

      await channel.send({
        content: `🎫 Ticket ouvert pour ${interaction.user}\n\nMerci de fournir les détails de votre commande:\n- 💰 **Montant des Kamas**\n- 🗺️ **Serveur**\n- 💳 **Méthode de paiement**`,
        components: [buttonRow],
      });

      await interaction.reply({
        content: `✅ Votre commande a été lancée. Veuillez continuer dans ${channel}.`,
        ephemeral: true,
      });
    }

    // Modal trigger button
    else if (interaction.customId === 'open_order_modal') {
      const modal = new ModalBuilder()
        .setCustomId('order_details_modal')
        .setTitle('Détails de la commande');

      const amountInput = new TextInputBuilder()
        .setCustomId('amount_input')
        .setLabel('Montant des Kamas (ex: 5M)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const serverInput = new TextInputBuilder()
        .setCustomId('server_input')
        .setLabel('Nom du serveur (ex: Brumen)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const paymentInput = new TextInputBuilder()
        .setCustomId('payment_input')
        .setLabel('Méthode de paiement (Paypal, Crypto, Carte)')
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(amountInput),
        new ActionRowBuilder().addComponents(serverInput),
        new ActionRowBuilder().addComponents(paymentInput),
      );

      await interaction.showModal(modal);
    }
  }

  // Modal submitted
  else if (interaction.isModalSubmit()) {
    if (interaction.customId === 'order_details_modal') {
      const amount = interaction.fields.getTextInputValue('amount_input');
      const server = interaction.fields.getTextInputValue('server_input');
      const payment = interaction.fields.getTextInputValue('payment_input');

      let paymentInfo = '';
      if (payment.toLowerCase().includes('paypal')) {
        paymentInfo += '\nTo continue payment pls send money to **PayPal** 📧 : YOUR_PAYPAL_ADDRESS';
      }
      if (payment.toLowerCase().includes('crypto')) {
        paymentInfo += '\nTo continue payment pls send money to **Crypto** 🪙 : YOUR_CRYPTO_WALLET';
      }
      if (payment.toLowerCase().includes('carte')) {
        paymentInfo += '\nTo continue payment pls send money to **Carte Internationale** 💳 : YOUR_PAYMENT_REFERENCE';
      }

      await interaction.reply({
        content:
          `✅ Détails de la commande reçus:\n\n` +
          `- 💰 **Montant**: ${amount}\n` +
          `- 🗺️ **Serveur**: ${server}\n` +
          `- 💳 **Méthode de paiement**: ${payment}${paymentInfo}`,
      });
    }
  }
});

// ⬇️ LOGIN COMES LAST!
client.login(config.token);
