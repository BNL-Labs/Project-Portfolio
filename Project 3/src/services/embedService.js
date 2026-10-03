const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuBuilder
} = require("discord.js");
const { ORDER_STATUS } = require("../utils/constants");
const { formatMoney, formatEta, truncate } = require("../utils/format");

class EmbedService {
  constructor(configService, paymentService) {
    this.configService = configService;
    this.paymentService = paymentService;
  }

  getSettings() {
    return this.configService.get();
  }

  buildPanel() {
    const settings = this.getSettings();
    const embed = new EmbedBuilder()
      .setColor(settings.branding.accentColor)
      .setTitle("Premium Dofus Power Leveling")
      .setDescription(
        [
          "Fast, clear, and staff-managed PL orders directly inside Discord.",
          "",
          "What you can do here:",
          "- Open a PL order",
          "- Get price and ETA before paying",
          "- Choose CIH / other bank / optional kamas payment",
          "- Upload payment proof and track progress",
          "- Confirm delivery and leave feedback"
        ].join("\n")
      )
      .setFooter({ text: settings.branding.footerText });

    const components = [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("panel:buy_pl")
          .setLabel("Buy PL")
          .setStyle(ButtonStyle.Success),
        new ButtonBuilder()
          .setCustomId("panel:ask_question")
          .setLabel("Ask Question")
          .setStyle(ButtonStyle.Primary),
        new ButtonBuilder()
          .setCustomId("panel:report_issue")
          .setLabel("Report Issue")
          .setStyle(ButtonStyle.Danger)
      )
    ];

    return { embed, components };
  }

  buildStaffPanel() {
    const settings = this.getSettings();
    const embed = new EmbedBuilder()
      .setColor(settings.branding.accentColor)
      .setTitle("Staff Command Center")
      .setDescription(
        [
          "Staff-only control panel for the PL bot.",
          "",
          "Available button actions:",
          "- Post the public order panel",
          "- Create or manage PL orders",
          "- Verify or reject payments",
          "- Close tickets or manage ticket access",
          "- Show or reload bot config"
        ].join("\n")
      )
      .setFooter({ text: "Visible actions are intended for staff/admin only." });

    const rowOne = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("staff:post_public_panel")
        .setLabel("Post Public Panel")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("staff:create_order")
        .setLabel("Create Order")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("staff:order_status")
        .setLabel("Order Status")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("staff:update_progress")
        .setLabel("Update Progress")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("staff:claim_order")
        .setLabel("Claim Order")
        .setStyle(ButtonStyle.Secondary)
    );

    const rowTwo = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("staff:complete_order")
        .setLabel("Complete Order")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("staff:cancel_order")
        .setLabel("Cancel Order")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("staff:order_note")
        .setLabel("Add Staff Note")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("staff:verify_payment")
        .setLabel("Verify Payment")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("staff:reject_payment")
        .setLabel("Reject Payment")
        .setStyle(ButtonStyle.Danger)
    );

    const rowThree = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("staff:close_ticket")
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("staff:add_user")
        .setLabel("Add User")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("staff:remove_user")
        .setLabel("Remove User")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("staff:config_show")
        .setLabel("Show Config")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("staff:config_reload")
        .setLabel("Reload Config")
        .setStyle(ButtonStyle.Secondary)
    );

    return {
      embed,
      components: [rowOne, rowTwo, rowThree]
    };
  }

  buildDraftSummary(draft) {
    const settings = this.getSettings();
    const description = [
      `Server: ${draft.server || "Not set"}`,
      `Current level: ${draft.currentLevel || "Not set"}`,
      `Target level: ${draft.targetLevel || "Not set"}`,
      `Speed: ${draft.speed === "rush" ? "Rush" : "Normal"}`,
      `Payment: ${draft.paymentProfileLabel || "Select a payment method"}`,
      `Order type: ${draft.quote?.packageLabel || "Pending"}`,
      "",
      `Base price: ${draft.quote ? formatMoney(draft.quote.basePriceMad, draft.quote.currency) : "Pending"}`,
      `Rush fee: ${draft.quote ? formatMoney(draft.quote.rushFeeMad, draft.quote.currency) : "Pending"}`,
      `Bank fee: ${draft.quote ? formatMoney(draft.quote.bankFeeMad, draft.quote.currency) : "Pending"}`,
      `Total: ${draft.quote ? formatMoney(draft.quote.totalMad, draft.quote.currency) : "Pending"}`,
      `ETA: ${draft.quote ? formatEta(draft.quote.etaHoursFinal) : "Pending"}`,
      "",
      `Notes: ${draft.notes ? truncate(draft.notes, 300) : "None"}`
    ].join("\n");

    const embed = new EmbedBuilder()
      .setColor(settings.branding.accentColor)
      .setTitle("PL Order Configurator")
      .setDescription(description)
      .setFooter({ text: "Choose speed and payment, then confirm your order." });

    const speedSelect = new StringSelectMenuBuilder()
      .setCustomId(`orderDraft:speed:${draft.id}`)
      .setPlaceholder("Select service speed")
      .addOptions(
        {
          label: "Normal",
          value: "normal",
          description: "Standard ETA and standard price.",
          default: draft.speed !== "rush"
        },
        {
          label: "Rush",
          value: "rush",
          description: "Priority handling with added rush fee.",
          default: draft.speed === "rush"
        }
      );

    const paymentOptions = this.paymentService.getProfiles().map((profile) => ({
      label: profile.label,
      value: profile.key,
      description: profile.description,
      default: draft.paymentProfileKey === profile.key
    }));

    const paymentSelect = new StringSelectMenuBuilder()
      .setCustomId(`orderDraft:payment:${draft.id}`)
      .setPlaceholder("Select payment method")
      .addOptions(paymentOptions);

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`orderDraft:confirm:${draft.id}`)
        .setLabel("Confirm Order")
        .setStyle(ButtonStyle.Success)
        .setDisabled(!draft.paymentProfileKey),
      new ButtonBuilder()
        .setCustomId(`orderDraft:cancel:${draft.id}`)
        .setLabel("Cancel")
        .setStyle(ButtonStyle.Secondary)
    );

    return {
      embed,
      components: [
        new ActionRowBuilder().addComponents(speedSelect),
        new ActionRowBuilder().addComponents(paymentSelect),
        buttons
      ]
    };
  }

  buildOrderTicket(order) {
    const settings = this.getSettings();
    return new EmbedBuilder()
      .setColor(settings.branding.accentColor)
      .setTitle(`PL Order ${order.id}`)
      .setDescription(
        [
          `Customer: <@${order.customerId}>`,
          `Server: ${order.server}`,
          `Service: ${order.quote.packageLabel}`,
          `Levels: ${order.currentLevel} -> ${order.targetLevel}`,
          `Speed: ${order.quote.rushSelected ? "Rush" : "Normal"}`,
          `ETA: ${formatEta(order.quote.etaHoursFinal)}`,
          "",
          `Status: ${order.status}`,
          `Payment status: ${order.payment.state}`,
          `Payment method: ${order.payment.profileLabel}`,
          `Claimed by: ${order.claimedBy ? `<@${order.claimedBy}>` : "Unclaimed"}`,
          "",
          `Base price: ${formatMoney(order.quote.basePriceMad, order.quote.currency)}`,
          `Rush fee: ${formatMoney(order.quote.rushFeeMad, order.quote.currency)}`,
          `Bank fee: ${formatMoney(order.quote.bankFeeMad, order.quote.currency)}`,
          `Total due: ${formatMoney(order.quote.totalMad, order.quote.currency)}`,
          "",
          `Progress: ${order.progress.bar}`,
          `Current level: ${order.progress.currentLevel}`,
          `Target level: ${order.progress.targetLevel}`,
          "",
          `Customer notes: ${order.notes ? truncate(order.notes, 400) : "None"}`
        ].join("\n")
      )
      .setFooter({ text: settings.branding.footerText });
  }

  buildPaymentInstructions(order) {
    const settings = this.getSettings();
    const paymentInfo = this.paymentService.getPaymentInstructions(order);
    return new EmbedBuilder()
      .setColor(settings.branding.warningColor)
      .setTitle(paymentInfo.title)
      .setDescription(paymentInfo.lines.join("\n"))
      .addFields({
        name: "Billing",
        value: [
          `Base PL price: ${formatMoney(order.quote.basePriceMad, order.quote.currency)}`,
          `Rush fee: ${formatMoney(order.quote.rushFeeMad, order.quote.currency)}`,
          `Bank fee: ${formatMoney(order.quote.bankFeeMad, order.quote.currency)}`,
          `Final total: ${formatMoney(order.quote.totalMad, order.quote.currency)}`
        ].join("\n")
      })
      .setFooter({ text: settings.payment.instructions });
  }

  buildProofReceived(order) {
    const settings = this.getSettings();
    return new EmbedBuilder()
      .setColor(settings.branding.warningColor)
      .setTitle("Payment Proof Received")
      .setDescription(
        `Proof uploaded for ${order.id}. Status moved to ${ORDER_STATUS.WAITING_VERIFICATION}. Staff can now verify, reject, or request a new proof.`
      );
  }

  buildCompletionPrompt(order) {
    const settings = this.getSettings();
    return new EmbedBuilder()
      .setColor(settings.branding.successColor)
      .setTitle("Order Marked Complete")
      .setDescription(
        [
          `Your power leveling order ${order.id} is marked as complete.`,
          "Please confirm completion, report a problem if something is wrong, and leave a rating if you want."
        ].join("\n")
      )
      .setFooter({ text: settings.branding.footerText });
  }

  buildReviewCard(review) {
    const settings = this.getSettings();
    return new EmbedBuilder()
      .setColor(settings.branding.successColor)
      .setTitle(`New ${review.stars}-Star Review`)
      .setDescription(review.text || "No written review provided.")
      .addFields(
        { name: "Order", value: review.orderId, inline: true },
        { name: "Customer", value: `<@${review.customerId}>`, inline: true }
      );
  }

  buildTicketActionRows(order) {
    const customerRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order:payment_info:${order.id}`)
        .setLabel("Payment Details")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`order:upload_proof:${order.id}`)
        .setLabel("Upload Proof")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`review:open:${order.id}`)
        .setLabel("Leave Review")
        .setStyle(ButtonStyle.Success)
        .setDisabled(order.status !== ORDER_STATUS.COMPLETED),
      new ButtonBuilder()
        .setCustomId(`ticket:close:${order.id}`)
        .setLabel("Close Ticket")
        .setStyle(ButtonStyle.Danger)
    );

    const staffRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order:claim:${order.id}`)
        .setLabel("Claim Order")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`order:verify_payment:${order.id}`)
        .setLabel("Verify Payment")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`order:reject_payment:${order.id}`)
        .setLabel("Reject Payment")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`order:ask_new_proof:${order.id}`)
        .setLabel("Ask New Proof")
        .setStyle(ButtonStyle.Secondary)
    );

    const staffRowTwo = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order:update_progress:${order.id}`)
        .setLabel("Update Progress")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId(`order:change_status:${order.id}`)
        .setLabel("Change Status")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`order:add_staff_note:${order.id}`)
        .setLabel("Add Staff Note")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`order:adjust_billing:${order.id}`)
        .setLabel("Adjust Billing")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId(`order:complete:${order.id}`)
        .setLabel("Complete Order")
        .setStyle(ButtonStyle.Success)
    );

    const staffRowThree = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order:cancel:${order.id}`)
        .setLabel("Cancel Order")
        .setStyle(ButtonStyle.Danger)
    );

    return [customerRow, staffRow, staffRowTwo, staffRowThree];
  }

  buildCustomerCompletionRow(orderId) {
    return new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`order:confirm_completion:${orderId}`)
        .setLabel("Confirm Completion")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`order:report_problem:${orderId}`)
        .setLabel("Report Problem")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId(`review:open:${orderId}`)
        .setLabel("Leave Rating")
        .setStyle(ButtonStyle.Primary)
    );
  }

  buildStatusMenu(orderId) {
    return new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId(`order:status_select:${orderId}`)
        .setPlaceholder("Choose a new order status")
        .addOptions(
          { label: ORDER_STATUS.WAITING_PAYMENT, value: ORDER_STATUS.WAITING_PAYMENT },
          { label: ORDER_STATUS.WAITING_VERIFICATION, value: ORDER_STATUS.WAITING_VERIFICATION },
          { label: ORDER_STATUS.PAID, value: ORDER_STATUS.PAID },
          { label: ORDER_STATUS.IN_PROGRESS, value: ORDER_STATUS.IN_PROGRESS },
          { label: ORDER_STATUS.PAUSED, value: ORDER_STATUS.PAUSED },
          { label: ORDER_STATUS.COMPLETED, value: ORDER_STATUS.COMPLETED },
          { label: ORDER_STATUS.CANCELLED, value: ORDER_STATUS.CANCELLED }
        )
    );
  }

  buildStaffNoteSaved() {
    return new EmbedBuilder()
      .setColor(this.getSettings().branding.successColor)
      .setDescription("Staff note saved privately.");
  }

  buildStatusSnapshot(order) {
    return new EmbedBuilder()
      .setColor(this.getSettings().branding.accentColor)
      .setTitle(`Order Status ${order.id}`)
      .setDescription(
        [
          `Status: ${order.status}`,
          `Payment status: ${order.payment.state}`,
          `Progress: ${order.progress.bar}`,
          `Current level: ${order.progress.currentLevel}`,
          `Target level: ${order.progress.targetLevel}`,
          `Claimed by: ${order.claimedBy ? `<@${order.claimedBy}>` : "Unclaimed"}`
        ].join("\n")
      );
  }

  buildLogEmbed({ title, description, color, fields = [] }) {
    return new EmbedBuilder()
      .setColor(color || this.getSettings().branding.accentColor)
      .setTitle(title)
      .setDescription(description)
      .addFields(fields);
  }
}

module.exports = EmbedService;
