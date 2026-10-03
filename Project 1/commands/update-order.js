import { SlashCommandBuilder } from 'discord.js';
import fs from 'fs';

export default {
  data: new SlashCommandBuilder()
    .setName('update-order')
    .setDescription('Mettre à jour le statut d\'une commande')
    .addIntegerOption(opt =>
      opt.setName('id').setDescription('ID de la commande').setRequired(true))
    .addStringOption(opt =>
      opt.setName('status').setDescription('Nouveau statut').setRequired(true)
        .addChoices(
          { name: 'Payé', value: 'Payé' },
          { name: 'Livré', value: 'Livré' }
        )),
  
  async execute(interaction) {
    const id = interaction.options.getInteger('id');
    const status = interaction.options.getString('status');
    const orders = JSON.parse(fs.readFileSync('./orders.json', 'utf8'));

    const order = orders.find(o => o.id === id);
    if (!order) {
      return interaction.reply({ content: '❌ Commande non trouvée.', ephemeral: true });
    }

    order.status = status;
    fs.writeFileSync('./orders.json', JSON.stringify(orders, null, 2));

    try {
      const user = await interaction.client.users.cache.find(u => u.username === order.buyer);
      if (user && status === 'Livré') {
        await user.send(`📦 Bonjour ! Votre commande de ${order.kamas} Kamas sur ${order.server} a été **livrée** ✅`);
      }
    } catch (e) {
      console.error('DM failed', e);
    }

    await interaction.reply({ content: `✅ Statut de la commande #${id} mis à jour à **${status}**.`, ephemeral: true });
  }
};
