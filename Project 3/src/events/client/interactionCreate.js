const { handleComponentInteraction } = require("../../components");

module.exports = {
  name: "interactionCreate",
  async execute(client, interaction) {
    const services = client.services;

    try {
      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) {
          return;
        }
        await command.execute(interaction, services);
        return;
      }

      if (interaction.isButton() || interaction.isStringSelectMenu() || interaction.isModalSubmit()) {
        await handleComponentInteraction(interaction, services);
      }
    } catch (error) {
      console.error(error);
      if (!interaction.isRepliable()) {
        return;
      }
      const payload = { content: `An error occurred: ${error.message}`, ephemeral: true };
      if (interaction.deferred || interaction.replied) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
  }
};
