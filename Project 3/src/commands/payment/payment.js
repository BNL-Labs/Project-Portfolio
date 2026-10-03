const { SlashCommandBuilder } = require("discord.js");
const { isStaff } = require("../../utils/permissions");
const { refreshOrderTicket } = require("../../components");

function resolveOrder(interaction, services) {
  const orderId = interaction.options.getString("order_id");
  if (orderId) {
    return services.orderService.getOrder(orderId);
  }
  return services.orderService.findByChannelId(interaction.channelId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("payment")
    .setDescription("Manage payment validation.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("verify")
        .setDescription("Verify an order payment.")
        .addStringOption((option) =>
          option.setName("order_id").setDescription("Order ID like PL-0001").setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("reject")
        .setDescription("Reject an order payment.")
        .addStringOption((option) =>
          option.setName("reason").setDescription("Reason for rejection.").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("order_id").setDescription("Order ID like PL-0001").setRequired(false)
        )
    ),
  async execute(interaction, services) {
    const settings = services.configService.get();
    if (!isStaff(interaction.member, settings)) {
      return interaction.reply({ content: "This command is for staff only.", ephemeral: true });
    }

    const order = resolveOrder(interaction, services);
    if (!order) {
      return interaction.reply({ content: "Order not found. Use this inside a ticket or pass an order ID.", ephemeral: true });
    }

    const subcommand = interaction.options.getSubcommand();
    if (subcommand === "verify") {
      await services.orderService.verifyPayment(order.id, interaction.user.id);
      await refreshOrderTicket(order.id, services);
      return interaction.reply({ content: `Payment verified for ${order.id}.`, ephemeral: true });
    }

    if (subcommand === "reject") {
      const reason = interaction.options.getString("reason");
      await services.orderService.rejectPayment(order.id, interaction.user.id, reason, false);
      await refreshOrderTicket(order.id, services);
      return interaction.reply({ content: `Payment rejected for ${order.id}.`, ephemeral: true });
    }

    return interaction.reply({ content: "Unsupported subcommand.", ephemeral: true });
  }
};
