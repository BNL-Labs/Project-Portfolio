const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder
} = require('discord.js');
const dayjs = require('dayjs');

const { BRAND } = require('../config/constants');

function baseEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(BRAND.palette.gold)
    .setTitle(title)
    .setDescription(description)
    .setFooter({ text: BRAND.footer })
    .setTimestamp();
}

function infoEmbed(title, description) {
  return baseEmbed(title, description).setColor(BRAND.palette.info);
}

function successEmbed(title, description) {
  return baseEmbed(title, description).setColor(BRAND.palette.success);
}

function warningEmbed(title, description) {
  return baseEmbed(title, description).setColor(BRAND.palette.warning);
}

function errorEmbed(title, description) {
  return baseEmbed(title, description).setColor(BRAND.palette.danger);
}

function createPanelEmbed({ title, description, eyebrow, lines = [] }) {
  const embed = baseEmbed(title, description);

  if (eyebrow) {
    embed.addFields({ name: 'Concierge Note', value: eyebrow });
  }

  if (lines.length) {
    embed.addFields({ name: 'Experience', value: lines.map((line) => `- ${line}`).join('\n') });
  }

  return embed;
}

function orderSummaryEmbed(order) {
  return baseEmbed(`Order ${order.orderId}`, 'Your private order lounge has been created.')
    .addFields(
      { name: 'Client', value: `<@${order.customerId}>`, inline: true },
      { name: 'Status', value: order.status, inline: true },
      { name: 'Type', value: order.type, inline: true },
      { name: 'Product', value: order.productName || 'Not specified', inline: true },
      { name: 'Category', value: order.category || 'Not specified', inline: true },
      { name: 'Quantity', value: String(order.quantity || 1), inline: true },
      { name: 'Size', value: order.size || 'Not specified', inline: true },
      { name: 'Color', value: order.color || 'Not specified', inline: true },
      { name: 'Payment', value: order.paymentMethod || 'Not specified', inline: true },
      { name: 'Region', value: order.region || 'Not specified', inline: true },
      { name: 'Delivery Note', value: order.deliveryNote || 'No delivery note provided.' },
      { name: 'Extra Request', value: order.extraRequest || 'No additional request provided.' }
    );
}

function supportSummaryEmbed(ticket) {
  return baseEmbed(`Support ${ticket.ticketId}`, 'A specialist will assist you shortly.')
    .addFields(
      { name: 'Client', value: `<@${ticket.userId}>`, inline: true },
      { name: 'Type', value: ticket.type, inline: true },
      { name: 'Priority', value: ticket.priority, inline: true },
      { name: 'Subject', value: ticket.subject || 'No subject provided.' },
      { name: 'Details', value: ticket.details || 'No details provided.' },
      { name: 'Order Reference', value: ticket.orderReference || 'Not linked', inline: false }
    );
}

function reviewEmbed(review) {
  return baseEmbed(`Review for ${review.orderId}`, 'Thank you for choosing Luxénza.')
    .addFields(
      { name: 'Client', value: `<@${review.userId}>`, inline: true },
      { name: 'Rating', value: `${review.rating}/5`, inline: true },
      { name: 'Recommend', value: review.recommend ? 'Yes' : 'No', inline: true },
      { name: 'Review', value: review.reviewText }
    );
}

function announcementEmbed(data) {
  const embed = baseEmbed(data.title, data.description)
    .addFields(
      { name: 'Collection', value: data.type, inline: true },
      { name: 'Detail', value: data.subtitle || 'Luxénza update', inline: true },
      { name: 'Call To Action', value: data.ctaText || 'Connect with our concierge team.' }
    );

  if (data.code) {
    embed.addFields({ name: 'Code', value: data.code, inline: true });
  }

  if (data.percent) {
    embed.addFields({ name: 'Offer', value: `${data.percent}%`, inline: true });
  }

  if (data.imageUrl) {
    embed.setImage(data.imageUrl);
  }

  return embed;
}

function logEmbed(title, description, details = []) {
  const embed = infoEmbed(title, description);
  details.forEach((detail) => embed.addFields(detail));
  return embed;
}

function systemStatusEmbed(summary) {
  return baseEmbed('System Status', 'Operational visibility for LX Concierge.')
    .addFields(
      { name: 'Channels', value: `${summary.channelsConfigured}/${summary.totalChannelsConfigured}`, inline: true },
      { name: 'Categories', value: `${summary.categoriesConfigured}/${summary.totalCategoriesConfigured}`, inline: true },
      { name: 'Roles', value: `${summary.rolesConfigured}/${summary.totalRolesConfigured}`, inline: true },
      { name: 'Flags', value: summary.flags.join('\n') || 'No active flags.' }
    );
}

function orderActionRows(orderId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`order-action:claim:${orderId}`).setLabel('Claim Order').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`order-action:awaiting_payment:${orderId}`).setLabel('Mark Awaiting Payment').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`order-action:payment_verified:${orderId}`).setLabel('Mark Payment Verified').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`order-action:confirmed:${orderId}`).setLabel('Mark Confirmed').setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`order-action:processing:${orderId}`).setLabel('Mark In Progress').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`order-action:delivered:${orderId}`).setLabel('Mark Delivered').setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`order-action:cancelled:${orderId}`).setLabel('Mark Cancelled').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId(`order-action:close:${orderId}`).setLabel('Close Order').setStyle(ButtonStyle.Secondary)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`order-action:add_note:${orderId}`).setLabel('Add Note').setStyle(ButtonStyle.Secondary)
    )
  ];
}

function ticketActionRows(ticketId) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`ticket-action:claim:${ticketId}`).setLabel('Claim Ticket').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ticket-action:priority:${ticketId}`).setLabel('Set Priority').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`ticket-action:add_note:${ticketId}`).setLabel('Add Note').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId(`ticket-action:close:${ticketId}`).setLabel('Close Ticket').setStyle(ButtonStyle.Danger)
    )
  ];
}

function humanTimestamp(date) {
  return dayjs(date).format('MMM D, YYYY HH:mm');
}

module.exports = {
  announcementEmbed,
  createPanelEmbed,
  errorEmbed,
  humanTimestamp,
  infoEmbed,
  logEmbed,
  orderActionRows,
  orderSummaryEmbed,
  reviewEmbed,
  successEmbed,
  supportSummaryEmbed,
  systemStatusEmbed,
  ticketActionRows,
  warningEmbed
};
