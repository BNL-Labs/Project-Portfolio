const { SlashCommandBuilder } = require("discord.js");
const { isStaff } = require("../../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("config")
    .setDescription("Inspect or reload bot configuration.")
    .addSubcommand((subcommand) =>
      subcommand.setName("show").setDescription("Show the current high-level config summary.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("reload").setDescription("Reload config from disk.")
    ),
  async execute(interaction, services) {
    const settings = services.configService.get();
    if (!isStaff(interaction.member, settings)) {
      return interaction.reply({ content: "This command is for staff only.", ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "reload") {
      services.configService.reload();
      return interaction.reply({ content: "Config reloaded from disk.", ephemeral: true });
    }

    return interaction.reply({
      content: [
        `Ticket category: ${settings.tickets.categoryId}`,
        `Archive category: ${settings.tickets.archiveCategoryId}`,
        `Logs channel: ${settings.channels.logsChannelId}`,
        `Feedback channel: ${settings.channels.feedbackChannelId}`,
        `Staff roles: ${settings.roles.staffRoleIds.join(", ")}`,
        `Kamas enabled: ${settings.payment.kamas.enabled ? "yes" : "no"}`
      ].join("\n"),
      ephemeral: true
    });
  }
};
