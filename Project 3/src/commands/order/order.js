const { SlashCommandBuilder } = require("discord.js");
const { ORDER_STATUS } = require("../../utils/constants");
const { isStaff } = require("../../utils/permissions");
const { startOrderDraft, refreshOrderTicket } = require("../../components");

function resolveOrder(interaction, services) {
  const orderId = interaction.options.getString("order_id");
  if (orderId) {
    return services.orderService.getOrder(orderId);
  }
  return services.orderService.findByChannelId(interaction.channelId);
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("order")
    .setDescription("Manage PL orders.")
    .addSubcommand((subcommand) =>
      subcommand.setName("create").setDescription("Open the PL order configurator.")
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("status")
        .setDescription("Show the current order status.")
        .addStringOption((option) =>
          option.setName("order_id").setDescription("Order ID like PL-0001").setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("progress")
        .setDescription("Update order progress.")
        .addIntegerOption((option) =>
          option.setName("current_level").setDescription("Current level reached.").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("note").setDescription("Optional milestone note.").setRequired(false)
        )
        .addStringOption((option) =>
          option.setName("order_id").setDescription("Order ID like PL-0001").setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("claim")
        .setDescription("Claim an order.")
        .addStringOption((option) =>
          option.setName("order_id").setDescription("Order ID like PL-0001").setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("complete")
        .setDescription("Mark an order as completed.")
        .addStringOption((option) =>
          option.setName("order_id").setDescription("Order ID like PL-0001").setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("cancel")
        .setDescription("Cancel an order.")
        .addStringOption((option) =>
          option.setName("reason").setDescription("Reason for cancellation.").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("order_id").setDescription("Order ID like PL-0001").setRequired(false)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("note")
        .setDescription("Add a private staff note.")
        .addStringOption((option) =>
          option.setName("note").setDescription("Private internal note.").setRequired(true)
        )
        .addStringOption((option) =>
          option.setName("order_id").setDescription("Order ID like PL-0001").setRequired(false)
        )
    ),
  async execute(interaction, services) {
    const subcommand = interaction.options.getSubcommand();
    const settings = services.configService.get();

    if (subcommand === "create") {
      return startOrderDraft(interaction, services);
    }

    const order = resolveOrder(interaction, services);
    if (!order) {
      return interaction.reply({ content: "Order not found. Use this inside a ticket or pass an order ID.", ephemeral: true });
    }

    if (subcommand === "status") {
      const canView = order.customerId === interaction.user.id || isStaff(interaction.member, settings);
      if (!canView) {
        return interaction.reply({ content: "You do not have access to this order.", ephemeral: true });
      }
      return interaction.reply({
        embeds: [services.embedService.buildStatusSnapshot(order)],
        ephemeral: true
      });
    }

    if (!isStaff(interaction.member, settings)) {
      return interaction.reply({ content: "This subcommand is for staff only.", ephemeral: true });
    }

    if (subcommand === "progress") {
      const currentLevel = interaction.options.getInteger("current_level");
      const note = interaction.options.getString("note") || "";
      await services.orderService.updateProgress(order.id, interaction.user.id, currentLevel, note);
      await refreshOrderTicket(order.id, services);
      return interaction.reply({ content: `Progress updated for ${order.id}.`, ephemeral: true });
    }

    if (subcommand === "claim") {
      await services.orderService.claimOrder(order.id, interaction.user.id);
      await refreshOrderTicket(order.id, services);
      return interaction.reply({ content: `You claimed ${order.id}.`, ephemeral: true });
    }

    if (subcommand === "complete") {
      await services.orderService.setStatus(order.id, ORDER_STATUS.COMPLETED, interaction.user.id);
      await refreshOrderTicket(order.id, services);
      if (interaction.channel && order.customerId) {
        const completionPrompt = await interaction.channel.send({
          content: `<@${order.customerId}>`,
          embeds: [services.embedService.buildCompletionPrompt(services.orderService.getOrder(order.id))],
          components: [services.embedService.buildCustomerCompletionRow(order.id)]
        });
        await services.orderService.setCompletionMessage(order.id, completionPrompt.id);
      }
      return interaction.reply({ content: `${order.id} marked as completed.`, ephemeral: true });
    }

    if (subcommand === "cancel") {
      const reason = interaction.options.getString("reason");
      await services.orderService.setStatus(order.id, ORDER_STATUS.CANCELLED, interaction.user.id, reason);
      await refreshOrderTicket(order.id, services);
      return interaction.reply({ content: `${order.id} cancelled.`, ephemeral: true });
    }

    if (subcommand === "note") {
      const note = interaction.options.getString("note");
      await services.orderService.addStaffNote(order.id, interaction.user.id, note);
      return interaction.reply({ content: `Private note added to ${order.id}.`, ephemeral: true });
    }

    return interaction.reply({ content: "Unsupported subcommand.", ephemeral: true });
  }
};
