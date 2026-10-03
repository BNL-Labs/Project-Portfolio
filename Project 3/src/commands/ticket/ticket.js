const { SlashCommandBuilder } = require("discord.js");
const { isStaff } = require("../../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("ticket")
    .setDescription("Manage ticket access.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("close")
        .setDescription("Close the current ticket.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("adduser")
        .setDescription("Add a user to the current ticket.")
        .addUserOption((option) =>
          option.setName("user").setDescription("User to add.").setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("removeuser")
        .setDescription("Remove a user from the current ticket.")
        .addUserOption((option) =>
          option.setName("user").setDescription("User to remove.").setRequired(true)
        )
    ),
  async execute(interaction, services) {
    const settings = services.configService.get();
    const subcommand = interaction.options.getSubcommand();
    const order = services.orderService.findByChannelId(interaction.channelId);
    const isCustomer = order && interaction.user.id === order.customerId;

    if (!isCustomer && !isStaff(interaction.member, settings)) {
      return interaction.reply({ content: "You do not have access to this ticket command.", ephemeral: true });
    }

    if (subcommand === "close") {
      await interaction.reply({ content: "Closing ticket...", ephemeral: true });
      await services.ticketService.closeTicket(interaction.channel);
      return null;
    }

    if (!isStaff(interaction.member, settings)) {
      return interaction.reply({ content: "Only staff can manage ticket members.", ephemeral: true });
    }

    const user = interaction.options.getUser("user");
    if (subcommand === "adduser") {
      await services.ticketService.addUser(interaction.channel, user.id);
      return interaction.reply({ content: `${user} added to the ticket.`, ephemeral: true });
    }

    if (subcommand === "removeuser") {
      await services.ticketService.removeUser(interaction.channel, user.id);
      return interaction.reply({ content: `${user} removed from the ticket.`, ephemeral: true });
    }

    return interaction.reply({ content: "Unsupported subcommand.", ephemeral: true });
  }
};
