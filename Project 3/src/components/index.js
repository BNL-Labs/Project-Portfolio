const {
  ActionRowBuilder,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle
} = require("discord.js");
const { ORDER_STATUS, TICKET_TYPE } = require("../utils/constants");
const { isStaff } = require("../utils/permissions");

function buildOrderModal(draftId) {
  return new ModalBuilder()
    .setCustomId(`orderDraft:modal:${draftId}`)
    .setTitle("Create PL Order")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("server")
          .setLabel("Server")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("Draconiros, Tal Kasha, Orukam...")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("currentLevel")
          .setLabel("Current level")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("1")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("targetLevel")
          .setLabel("Target level")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("200")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("notes")
          .setLabel("Optional notes")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Rush context, class, availability, account notes...")
          .setRequired(false)
      )
    );
}

function buildReasonModal(customId, title, label, placeholder) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("reason")
          .setLabel(label)
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(placeholder)
          .setRequired(true)
      )
    );
}

function buildProgressModal(orderId, order) {
  return new ModalBuilder()
    .setCustomId(`order:progress_modal:${orderId}`)
    .setTitle("Update PL Progress")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("currentLevel")
          .setLabel("Current level")
          .setStyle(TextInputStyle.Short)
          .setValue(String(order.progress.currentLevel))
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("note")
          .setLabel("Milestone note")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Optional progress note for the timeline.")
          .setRequired(false)
      )
    );
}

function buildBillingModal(orderId, order) {
  return new ModalBuilder()
    .setCustomId(`order:billing_modal:${orderId}`)
    .setTitle("Adjust Billing")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("manualBankFeeMad")
          .setLabel("Manual bank fee (MAD)")
          .setStyle(TextInputStyle.Short)
          .setValue(String(order.payment.manualBankFeeMad ?? order.quote.bankFeeMad ?? 0))
          .setRequired(true)
      )
    );
}

function buildStaffNoteModal(orderId) {
  return new ModalBuilder()
    .setCustomId(`order:staff_note_modal:${orderId}`)
    .setTitle("Private Staff Note")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("note")
          .setLabel("Staff note")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Internal note only. Customer will not see this.")
          .setRequired(true)
      )
    );
}

function buildReviewModal(orderId) {
  return new ModalBuilder()
    .setCustomId(`review:modal:${orderId}`)
    .setTitle("Leave a Review")
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("stars")
          .setLabel("Star rating (1-5)")
          .setStyle(TextInputStyle.Short)
          .setPlaceholder("5")
          .setRequired(true)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("review")
          .setLabel("Optional review text")
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder("Tell us how the service went.")
          .setRequired(false)
      )
    );
}

function buildSingleInputModal(customId, title, fieldId, label, placeholder, required = true, style = TextInputStyle.Short) {
  return new ModalBuilder()
    .setCustomId(customId)
    .setTitle(title)
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(fieldId)
          .setLabel(label)
          .setStyle(style)
          .setPlaceholder(placeholder)
          .setRequired(required)
      )
    );
}

function buildMultiInputModal(customId, title, fields) {
  const modal = new ModalBuilder().setCustomId(customId).setTitle(title);
  for (const field of fields) {
    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId(field.id)
          .setLabel(field.label)
          .setStyle(field.style || TextInputStyle.Short)
          .setPlaceholder(field.placeholder || "")
          .setRequired(field.required !== false)
      )
    );
  }
  return modal;
}

async function getOrderChannel(order, services, guild) {
  if (!order?.channelId) {
    return null;
  }
  return guild.channels.cache.get(order.channelId) || await guild.channels.fetch(order.channelId).catch(() => null);
}

function resolveOrderById(services, orderId) {
  return services.orderService.getOrder(String(orderId || "").trim());
}

async function startOrderDraft(interaction, services) {
  const draft = await services.orderService.createDraft({
    guildId: interaction.guildId,
    userId: interaction.user.id
  });

  await interaction.showModal(buildOrderModal(draft.id));
}

async function refreshOrderTicket(orderId, services) {
  const order = services.orderService.getOrder(orderId);
  if (!order || !order.channelId || !order.ticketMessageId) {
    return order;
  }

  const guild = services.client.guilds.cache.get(order.guildId) || await services.client.guilds.fetch(order.guildId).catch(() => null);
  if (!guild) {
    return order;
  }

  const channel = guild.channels.cache.get(order.channelId) || await guild.channels.fetch(order.channelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return order;
  }

  const message = await channel.messages.fetch(order.ticketMessageId).catch(() => null);
  if (!message) {
    return order;
  }

  await message.edit({
    embeds: [
      services.embedService.buildOrderTicket(order),
      services.embedService.buildPaymentInstructions(order)
    ],
    components: services.embedService.buildTicketActionRows(order)
  }).catch(() => null);

  return order;
}

async function createSupportTicket(interaction, services, type) {
  const channel = await services.ticketService.createSupportTicket(interaction.guild, interaction.user.id, type);
  const embed = new EmbedBuilder()
    .setColor(services.configService.get().branding.accentColor)
    .setTitle(type === TICKET_TYPE.QUESTION ? "Question Ticket Opened" : "Issue Ticket Opened")
    .setDescription(
      type === TICKET_TYPE.QUESTION
        ? "A staff member will answer your question here."
        : "A staff member will review your issue here."
    );

  await channel.send({
    content: `<@${interaction.user.id}>`,
    embeds: [embed]
  });

  await interaction.reply({
    content: `Your ${type.toLowerCase()} ticket is ready: ${channel}`,
    ephemeral: true
  });
}

async function ensureStaffAccess(interaction, services) {
  const settings = services.configService.get();
  if (isStaff(interaction.member, settings)) {
    return true;
  }

  await interaction.reply({ content: "This action is for staff only.", ephemeral: true });
  return false;
}

async function ensureCustomerAccess(interaction, order) {
  if (interaction.user.id === order.customerId) {
    return true;
  }

  await interaction.reply({ content: "Only the ticket customer can use this action.", ephemeral: true });
  return false;
}

async function sendReviewToFeedback(review, services, guild) {
  const feedbackChannelId = services.configService.get().channels.feedbackChannelId;
  if (!feedbackChannelId || feedbackChannelId.startsWith("EDIT_")) {
    return;
  }

  if (review.stars < services.configService.get().reviews.minimumStarsForPublicPost) {
    return;
  }

  const channel = guild.channels.cache.get(feedbackChannelId) || await guild.channels.fetch(feedbackChannelId).catch(() => null);
  if (!channel || !channel.isTextBased()) {
    return;
  }

  await channel.send({ embeds: [services.embedService.buildReviewCard(review)] }).catch(() => null);
}

async function handleButton(interaction, services) {
  const [scope, action, orderId] = interaction.customId.split(":");

  if (interaction.customId === "panel:buy_pl") {
    return startOrderDraft(interaction, services);
  }
  if (interaction.customId === "panel:ask_question") {
    return createSupportTicket(interaction, services, TICKET_TYPE.QUESTION);
  }
  if (interaction.customId === "panel:report_issue") {
    return createSupportTicket(interaction, services, TICKET_TYPE.ISSUE);
  }

  if (scope === "orderDraft" && action === "confirm") {
    const draft = services.orderService.getDraft(orderId);
    if (!draft || draft.userId !== interaction.user.id) {
      return interaction.reply({ content: "This draft is no longer available.", ephemeral: true });
    }

    const createdOrder = await services.orderService.confirmDraft(orderId);
    const channel = await services.ticketService.createOrderTicket(interaction.guild, createdOrder);
    await services.orderService.setChannel(createdOrder.id, channel.id);
    const freshOrder = services.orderService.getOrder(createdOrder.id);
    const ticketMessage = await channel.send({
      content: `<@${freshOrder.customerId}>`,
      embeds: [
        services.embedService.buildOrderTicket(freshOrder),
        services.embedService.buildPaymentInstructions(freshOrder)
      ],
      components: services.embedService.buildTicketActionRows(freshOrder)
    });
    await services.orderService.setTicketMessage(freshOrder.id, ticketMessage.id);
    await services.loggingService.log(interaction.guild, {
      title: "Order Created",
      description: `Order ${freshOrder.id} created by <@${freshOrder.customerId}>.`,
      fields: [
        { name: "Server", value: freshOrder.server, inline: true },
        { name: "Levels", value: `${freshOrder.currentLevel} -> ${freshOrder.targetLevel}`, inline: true },
        { name: "Total", value: `${freshOrder.quote.totalMad} ${freshOrder.quote.currency}`, inline: true }
      ]
    });

    return interaction.update({
      content: `Order created successfully: ${channel}`,
      embeds: [],
      components: []
    });
  }

  if (scope === "orderDraft" && action === "cancel") {
    await services.orderService.deleteDraft(orderId);
    return interaction.update({
      content: "Order draft cancelled.",
      embeds: [],
      components: []
    });
  }

  if (scope === "staff") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }

    if (action === "post_public_panel") {
      return interaction.showModal(
        buildSingleInputModal(
          "staff:panel_modal",
          "Post Public Panel",
          "channelId",
          "Target channel ID",
          "Leave blank to post in this channel.",
          false
        )
      );
    }

    if (action === "create_order") {
      return startOrderDraft(interaction, services);
    }

    if (action === "order_status") {
      return interaction.showModal(
        buildSingleInputModal("staff:order_status_modal", "Order Status", "orderId", "Order ID", "PL-0001")
      );
    }

    if (action === "update_progress") {
      return interaction.showModal(
        buildMultiInputModal("staff:progress_modal", "Update Progress", [
          { id: "orderId", label: "Order ID", placeholder: "PL-0001" },
          { id: "currentLevel", label: "Current level", placeholder: "120" },
          { id: "note", label: "Milestone note", placeholder: "Optional note", required: false, style: TextInputStyle.Paragraph }
        ])
      );
    }

    if (action === "claim_order") {
      return interaction.showModal(
        buildSingleInputModal("staff:claim_modal", "Claim Order", "orderId", "Order ID", "PL-0001")
      );
    }

    if (action === "complete_order") {
      return interaction.showModal(
        buildSingleInputModal("staff:complete_modal", "Complete Order", "orderId", "Order ID", "PL-0001")
      );
    }

    if (action === "cancel_order") {
      return interaction.showModal(
        buildMultiInputModal("staff:cancel_modal", "Cancel Order", [
          { id: "orderId", label: "Order ID", placeholder: "PL-0001" },
          { id: "reason", label: "Reason", placeholder: "Explain why this order is cancelled.", style: TextInputStyle.Paragraph }
        ])
      );
    }

    if (action === "order_note") {
      return interaction.showModal(
        buildMultiInputModal("staff:note_modal", "Add Staff Note", [
          { id: "orderId", label: "Order ID", placeholder: "PL-0001" },
          { id: "note", label: "Private note", placeholder: "Internal note only.", style: TextInputStyle.Paragraph }
        ])
      );
    }

    if (action === "verify_payment") {
      return interaction.showModal(
        buildSingleInputModal("staff:verify_payment_modal", "Verify Payment", "orderId", "Order ID", "PL-0001")
      );
    }

    if (action === "reject_payment") {
      return interaction.showModal(
        buildMultiInputModal("staff:reject_payment_modal", "Reject Payment", [
          { id: "orderId", label: "Order ID", placeholder: "PL-0001" },
          { id: "reason", label: "Reason", placeholder: "Explain why the payment is rejected.", style: TextInputStyle.Paragraph }
        ])
      );
    }

    if (action === "close_ticket") {
      return interaction.showModal(
        buildSingleInputModal("staff:close_ticket_modal", "Close Ticket", "orderId", "Order ID", "PL-0001")
      );
    }

    if (action === "add_user") {
      return interaction.showModal(
        buildMultiInputModal("staff:add_user_modal", "Add Ticket User", [
          { id: "orderId", label: "Order ID", placeholder: "PL-0001" },
          { id: "userId", label: "User ID", placeholder: "Discord user ID" }
        ])
      );
    }

    if (action === "remove_user") {
      return interaction.showModal(
        buildMultiInputModal("staff:remove_user_modal", "Remove Ticket User", [
          { id: "orderId", label: "Order ID", placeholder: "PL-0001" },
          { id: "userId", label: "User ID", placeholder: "Discord user ID" }
        ])
      );
    }

    if (action === "config_show") {
      const settings = services.configService.get();
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

    if (action === "config_reload") {
      services.configService.reload();
      return interaction.reply({ content: "Config reloaded from disk.", ephemeral: true });
    }
  }

  const order = services.orderService.getOrder(orderId);
  if (!order) {
    return interaction.reply({ content: "Order not found.", ephemeral: true });
  }

  if (scope === "order" && action === "payment_info") {
    return interaction.reply({
      embeds: [services.embedService.buildPaymentInstructions(order)],
      ephemeral: true
    });
  }

  if (scope === "order" && action === "upload_proof") {
    if (!(await ensureCustomerAccess(interaction, order))) {
      return null;
    }
    return interaction.reply({
      content: "Upload your transfer proof as an image attachment in this ticket. The bot will detect it and move the order to waiting verification.",
      ephemeral: true
    });
  }

  if (scope === "order" && action === "claim") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    await services.orderService.claimOrder(orderId, interaction.user.id);
    await refreshOrderTicket(orderId, services);
    await services.loggingService.log(interaction.guild, {
      title: "Order Claimed",
      description: `Order ${orderId} claimed by <@${interaction.user.id}>.`
    });
    return interaction.reply({ content: `You claimed ${orderId}.`, ephemeral: true });
  }

  if (scope === "order" && action === "verify_payment") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    await services.orderService.verifyPayment(orderId, interaction.user.id);
    await refreshOrderTicket(orderId, services);
    await services.loggingService.log(interaction.guild, {
      title: "Payment Verified",
      description: `Payment verified for ${orderId} by <@${interaction.user.id}>.`
    });
    return interaction.reply({ content: `Payment verified for ${orderId}.`, ephemeral: true });
  }

  if (scope === "order" && action === "reject_payment") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    return interaction.showModal(
      buildReasonModal(
        `order:reject_modal:${orderId}:reject`,
        "Reject Payment",
        "Reason",
        "Explain clearly why the proof or payment was rejected."
      )
    );
  }

  if (scope === "order" && action === "ask_new_proof") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    return interaction.showModal(
      buildReasonModal(
        `order:reject_modal:${orderId}:asknew`,
        "Ask For New Proof",
        "What should be fixed?",
        "Example: please send a clearer screenshot with amount and reference visible."
      )
    );
  }

  if (scope === "order" && action === "update_progress") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    return interaction.showModal(buildProgressModal(orderId, order));
  }

  if (scope === "order" && action === "change_status") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    return interaction.reply({
      content: `Choose the new status for ${orderId}.`,
      components: [services.embedService.buildStatusMenu(orderId)],
      ephemeral: true
    });
  }

  if (scope === "order" && action === "add_staff_note") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    return interaction.showModal(buildStaffNoteModal(orderId));
  }

  if (scope === "order" && action === "adjust_billing") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    return interaction.showModal(buildBillingModal(orderId, order));
  }

  if (scope === "order" && action === "complete") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    await services.orderService.setStatus(orderId, ORDER_STATUS.COMPLETED, interaction.user.id);
    await refreshOrderTicket(orderId, services);
    const completionPrompt = await interaction.channel.send({
      content: `<@${order.customerId}>`,
      embeds: [services.embedService.buildCompletionPrompt(services.orderService.getOrder(orderId))],
      components: [services.embedService.buildCustomerCompletionRow(orderId)]
    });
    await services.orderService.setCompletionMessage(orderId, completionPrompt.id);
    await services.loggingService.log(interaction.guild, {
      title: "Order Completed",
      description: `Order ${orderId} marked complete by <@${interaction.user.id}>.`
    });
    return interaction.reply({ content: `${orderId} marked as completed.`, ephemeral: true });
  }

  if (scope === "order" && action === "cancel") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    return interaction.showModal(
      buildReasonModal(
        `order:cancel_modal:${orderId}`,
        "Cancel Order",
        "Reason",
        "Explain why this order is being cancelled."
      )
    );
  }

  if (scope === "order" && action === "confirm_completion") {
    if (!(await ensureCustomerAccess(interaction, order))) {
      return null;
    }
    await services.orderService.confirmCompletion(orderId, interaction.user.id);
    await services.loggingService.log(interaction.guild, {
      title: "Completion Confirmed",
      description: `Customer confirmed completion for ${orderId}.`
    });
    return interaction.reply({ content: "Completion confirmed. Thank you for your trust.", ephemeral: true });
  }

  if (scope === "order" && action === "report_problem") {
    if (!(await ensureCustomerAccess(interaction, order))) {
      return null;
    }
    await services.orderService.setStatus(orderId, ORDER_STATUS.PAUSED, interaction.user.id, "Customer reported a problem after completion.");
    await refreshOrderTicket(orderId, services);
    const staffRoleId = services.configService.get().roles.staffRoleIds[0];
    const mention = staffRoleId && !String(staffRoleId).startsWith("EDIT_") ? `<@&${staffRoleId}> ` : "";
    await interaction.channel.send(`${mention}Customer reported a problem on ${orderId}.`);
    return interaction.reply({ content: "Your issue has been reported to staff. We paused the order for review.", ephemeral: true });
  }

  if (scope === "review" && action === "open") {
    if (!(await ensureCustomerAccess(interaction, order))) {
      return null;
    }
    if (order.status !== ORDER_STATUS.COMPLETED) {
      return interaction.reply({ content: "Reviews open once the order is marked as completed.", ephemeral: true });
    }
    return interaction.showModal(buildReviewModal(orderId));
  }

  if (scope === "ticket" && action === "close") {
    const settings = services.configService.get();
    const allowed = interaction.user.id === order.customerId || isStaff(interaction.member, settings);
    if (!allowed) {
      return interaction.reply({ content: "Only the customer or staff can close this ticket.", ephemeral: true });
    }
    await services.ticketService.closeTicket(interaction.channel);
    await services.loggingService.log(interaction.guild, {
      title: "Ticket Closed",
      description: `Ticket for ${orderId} closed by <@${interaction.user.id}>.`
    });
    return null;
  }

  return interaction.reply({ content: "Unknown action.", ephemeral: true });
}

async function handleSelectMenu(interaction, services) {
  const [scope, action, id] = interaction.customId.split(":");

  if (scope === "orderDraft" && action === "speed") {
    const draft = services.orderService.getDraft(id);
    if (!draft || draft.userId !== interaction.user.id) {
      return interaction.reply({ content: "This draft is no longer available.", ephemeral: true });
    }
    const updated = await services.orderService.updateDraftFields(id, { speed: interaction.values[0] });
    const view = services.embedService.buildDraftSummary(updated);
    return interaction.update({ embeds: [view.embed], components: view.components });
  }

  if (scope === "orderDraft" && action === "payment") {
    const draft = services.orderService.getDraft(id);
    if (!draft || draft.userId !== interaction.user.id) {
      return interaction.reply({ content: "This draft is no longer available.", ephemeral: true });
    }
    const updated = await services.orderService.updateDraftFields(id, { paymentProfileKey: interaction.values[0] });
    const view = services.embedService.buildDraftSummary(updated);
    return interaction.update({ embeds: [view.embed], components: view.components });
  }

  if (scope === "order" && action === "status_select") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    await services.orderService.setStatus(id, interaction.values[0], interaction.user.id);
    await refreshOrderTicket(id, services);
    return interaction.update({
      content: `Status updated to ${interaction.values[0]}.`,
      components: []
    });
  }

  return interaction.reply({ content: "Unknown select menu action.", ephemeral: true });
}

async function handleModal(interaction, services) {
  const parts = interaction.customId.split(":");

  if (parts[0] === "orderDraft" && parts[1] === "modal") {
    const draftId = parts[2];
    const draft = services.orderService.getDraft(draftId);
    if (!draft || draft.userId !== interaction.user.id) {
      return interaction.reply({ content: "This draft is no longer available.", ephemeral: true });
    }

    try {
      const updated = await services.orderService.updateDraftFields(draftId, {
        server: interaction.fields.getTextInputValue("server"),
        currentLevel: Number(interaction.fields.getTextInputValue("currentLevel")),
        targetLevel: Number(interaction.fields.getTextInputValue("targetLevel")),
        notes: interaction.fields.getTextInputValue("notes")
      });
      const view = services.embedService.buildDraftSummary(updated);
      return interaction.reply({ embeds: [view.embed], components: view.components, ephemeral: true });
    } catch (error) {
      return interaction.reply({ content: error.message, ephemeral: true });
    }
  }

  if (parts[0] === "order" && parts[1] === "reject_modal") {
    const orderId = parts[2];
    const mode = parts[3];
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    const reason = interaction.fields.getTextInputValue("reason");
    await services.orderService.rejectPayment(orderId, interaction.user.id, reason, mode === "asknew");
    await refreshOrderTicket(orderId, services);
    await services.loggingService.log(interaction.guild, {
      title: mode === "asknew" ? "New Proof Requested" : "Payment Rejected",
      description: `${mode === "asknew" ? "New proof requested" : "Payment rejected"} for ${orderId} by <@${interaction.user.id}>.`,
      fields: [{ name: "Reason", value: reason }]
    });
    await interaction.channel.send(`Payment update for <@${services.orderService.getOrder(orderId).customerId}>: ${reason}`);
    return interaction.reply({ content: "Payment status updated.", ephemeral: true });
  }

  if (parts[0] === "order" && parts[1] === "progress_modal") {
    const orderId = parts[2];
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    const currentLevel = Number(interaction.fields.getTextInputValue("currentLevel"));
    const note = interaction.fields.getTextInputValue("note");
    await services.orderService.updateProgress(orderId, interaction.user.id, currentLevel, note);
    await refreshOrderTicket(orderId, services);
    await services.loggingService.log(interaction.guild, {
      title: "Progress Updated",
      description: `Progress updated for ${orderId} by <@${interaction.user.id}>.`,
      fields: [
        { name: "Current level", value: String(currentLevel), inline: true },
        { name: "Note", value: note || "None", inline: true }
      ]
    });
    return interaction.reply({ content: `Progress updated to level ${currentLevel}.`, ephemeral: true });
  }

  if (parts[0] === "order" && parts[1] === "staff_note_modal") {
    const orderId = parts[2];
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    const note = interaction.fields.getTextInputValue("note");
    await services.orderService.addStaffNote(orderId, interaction.user.id, note);
    await services.loggingService.log(interaction.guild, {
      title: "Staff Note Added",
      description: `Private staff note saved for ${orderId} by <@${interaction.user.id}>.`
    });
    return interaction.reply({ embeds: [services.embedService.buildStaffNoteSaved()], ephemeral: true });
  }

  if (parts[0] === "order" && parts[1] === "billing_modal") {
    const orderId = parts[2];
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    const manualBankFeeMad = Number(interaction.fields.getTextInputValue("manualBankFeeMad"));
    await services.orderService.adjustBilling(orderId, interaction.user.id, manualBankFeeMad);
    await refreshOrderTicket(orderId, services);
    await services.loggingService.log(interaction.guild, {
      title: "Billing Adjusted",
      description: `Billing adjusted for ${orderId} by <@${interaction.user.id}>.`,
      fields: [{ name: "Manual bank fee", value: `${manualBankFeeMad} MAD` }]
    });
    return interaction.reply({ content: `Billing updated. Manual bank fee is now ${manualBankFeeMad} MAD.`, ephemeral: true });
  }

  if (parts[0] === "order" && parts[1] === "cancel_modal") {
    const orderId = parts[2];
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }
    const reason = interaction.fields.getTextInputValue("reason");
    await services.orderService.setStatus(orderId, ORDER_STATUS.CANCELLED, interaction.user.id, reason);
    await refreshOrderTicket(orderId, services);
    await services.loggingService.log(interaction.guild, {
      title: "Order Cancelled",
      description: `Order ${orderId} cancelled by <@${interaction.user.id}>.`,
      fields: [{ name: "Reason", value: reason }]
    });
    await interaction.channel.send(`Order ${orderId} was cancelled. Reason: ${reason}`);
    return interaction.reply({ content: `${orderId} cancelled.`, ephemeral: true });
  }

  if (parts[0] === "staff") {
    if (!(await ensureStaffAccess(interaction, services))) {
      return null;
    }

    if (parts[1] === "panel_modal") {
      const targetChannelId = interaction.fields.getTextInputValue("channelId").trim();
      const channel = targetChannelId
        ? interaction.guild.channels.cache.get(targetChannelId) || await interaction.guild.channels.fetch(targetChannelId).catch(() => null)
        : interaction.channel;
      if (!channel || !channel.isTextBased()) {
        return interaction.reply({ content: "Target channel not found.", ephemeral: true });
      }
      const panel = services.embedService.buildPanel();
      await channel.send({ embeds: [panel.embed], components: panel.components });
      return interaction.reply({ content: `Public panel sent in ${channel}.`, ephemeral: true });
    }

    if (parts[1] === "order_status_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      return interaction.reply({ embeds: [services.embedService.buildStatusSnapshot(order)], ephemeral: true });
    }

    if (parts[1] === "progress_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      const currentLevel = Number(interaction.fields.getTextInputValue("currentLevel"));
      const note = interaction.fields.getTextInputValue("note");
      await services.orderService.updateProgress(order.id, interaction.user.id, currentLevel, note);
      await refreshOrderTicket(order.id, services);
      return interaction.reply({ content: `Progress updated for ${order.id}.`, ephemeral: true });
    }

    if (parts[1] === "claim_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      await services.orderService.claimOrder(order.id, interaction.user.id);
      await refreshOrderTicket(order.id, services);
      return interaction.reply({ content: `${order.id} claimed.`, ephemeral: true });
    }

    if (parts[1] === "complete_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      await services.orderService.setStatus(order.id, ORDER_STATUS.COMPLETED, interaction.user.id);
      await refreshOrderTicket(order.id, services);
      const orderChannel = await getOrderChannel(order, services, interaction.guild);
      if (orderChannel) {
        const completionPrompt = await orderChannel.send({
          content: `<@${order.customerId}>`,
          embeds: [services.embedService.buildCompletionPrompt(services.orderService.getOrder(order.id))],
          components: [services.embedService.buildCustomerCompletionRow(order.id)]
        });
        await services.orderService.setCompletionMessage(order.id, completionPrompt.id);
      }
      return interaction.reply({ content: `${order.id} marked as completed.`, ephemeral: true });
    }

    if (parts[1] === "cancel_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      const reason = interaction.fields.getTextInputValue("reason");
      await services.orderService.setStatus(order.id, ORDER_STATUS.CANCELLED, interaction.user.id, reason);
      await refreshOrderTicket(order.id, services);
      const orderChannel = await getOrderChannel(order, services, interaction.guild);
      if (orderChannel) {
        await orderChannel.send(`Order ${order.id} was cancelled. Reason: ${reason}`);
      }
      return interaction.reply({ content: `${order.id} cancelled.`, ephemeral: true });
    }

    if (parts[1] === "note_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      const note = interaction.fields.getTextInputValue("note");
      await services.orderService.addStaffNote(order.id, interaction.user.id, note);
      return interaction.reply({ content: `Private note added to ${order.id}.`, ephemeral: true });
    }

    if (parts[1] === "verify_payment_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      await services.orderService.verifyPayment(order.id, interaction.user.id);
      await refreshOrderTicket(order.id, services);
      return interaction.reply({ content: `Payment verified for ${order.id}.`, ephemeral: true });
    }

    if (parts[1] === "reject_payment_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      const reason = interaction.fields.getTextInputValue("reason");
      await services.orderService.rejectPayment(order.id, interaction.user.id, reason, false);
      await refreshOrderTicket(order.id, services);
      const orderChannel = await getOrderChannel(order, services, interaction.guild);
      if (orderChannel) {
        await orderChannel.send(`Payment update for <@${order.customerId}>: ${reason}`);
      }
      return interaction.reply({ content: `Payment rejected for ${order.id}.`, ephemeral: true });
    }

    if (parts[1] === "close_ticket_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      const orderChannel = await getOrderChannel(order, services, interaction.guild);
      if (!orderChannel) {
        return interaction.reply({ content: "Ticket channel not found.", ephemeral: true });
      }
      await services.ticketService.closeTicket(orderChannel);
      return interaction.reply({ content: `Ticket closed for ${order.id}.`, ephemeral: true });
    }

    if (parts[1] === "add_user_modal" || parts[1] === "remove_user_modal") {
      const order = resolveOrderById(services, interaction.fields.getTextInputValue("orderId"));
      if (!order) {
        return interaction.reply({ content: "Order not found.", ephemeral: true });
      }
      const orderChannel = await getOrderChannel(order, services, interaction.guild);
      if (!orderChannel) {
        return interaction.reply({ content: "Ticket channel not found.", ephemeral: true });
      }
      const userId = interaction.fields.getTextInputValue("userId").trim();
      const isRemove = parts[1] === "remove_user_modal";
      if (isRemove) {
        await services.ticketService.removeUser(orderChannel, userId);
      } else {
        await services.ticketService.addUser(orderChannel, userId);
      }
      return interaction.reply({
        content: `${isRemove ? "Removed" : "Added"} user ${userId} ${isRemove ? "from" : "to"} ${order.id}.`,
        ephemeral: true
      });
    }
  }

  if (parts[0] === "review" && parts[1] === "modal") {
    const orderId = parts[2];
    const order = services.orderService.getOrder(orderId);
    if (!order || order.customerId !== interaction.user.id) {
      return interaction.reply({ content: "You cannot review this order.", ephemeral: true });
    }
    const stars = Number(interaction.fields.getTextInputValue("stars"));
    if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
      return interaction.reply({ content: "Star rating must be a whole number between 1 and 5.", ephemeral: true });
    }
    const reviewText = interaction.fields.getTextInputValue("review");
    const review = await services.orderService.saveReview(orderId, interaction.user.id, stars, reviewText);
    await sendReviewToFeedback(review, services, interaction.guild);
    await services.loggingService.log(interaction.guild, {
      title: "Review Saved",
      description: `Review saved for ${orderId} with ${stars} stars.`
    });
    return interaction.reply({ content: "Thanks for the review.", ephemeral: true });
  }

  return interaction.reply({ content: "Unknown modal action.", ephemeral: true });
}

async function handleComponentInteraction(interaction, services) {
  if (interaction.isButton()) {
    return handleButton(interaction, services);
  }

  if (interaction.isStringSelectMenu()) {
    return handleSelectMenu(interaction, services);
  }

  if (interaction.isModalSubmit()) {
    return handleModal(interaction, services);
  }

  return null;
}

module.exports = {
  startOrderDraft,
  handleComponentInteraction,
  refreshOrderTicket
};
