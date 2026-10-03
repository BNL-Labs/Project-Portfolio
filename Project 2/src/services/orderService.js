const { ChannelType, PermissionFlagsBits } = require('discord.js');

const Order = require('../models/Order');
const { STAFF_ROLE_KEYS } = require('../config/constants');
const { createTranscriptRecord } = require('./transcriptService');
const { getNextSequence } = require('./settingsService');
const { incrementUserMetric } = require('./userService');
const { generateOrderChannelName, generateOrderId } = require('../utils/idGenerator');
const { orderActionRows, orderSummaryEmbed } = require('../utils/embedFactory');
const { recordStaffAction, writeGuildLog } = require('./loggingService');

function getStaffRoleIds(settings) {
  return STAFF_ROLE_KEYS.map((key) => settings.roleIds?.[key]).filter(Boolean);
}

function buildOrderOverwrites(guild, userId, settings) {
  return [
    { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    {
      id: userId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    },
    ...getStaffRoleIds(settings).map((roleId) => ({
      id: roleId,
      allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
    })),
    {
      id: guild.members.me.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ManageChannels,
        PermissionFlagsBits.ReadMessageHistory
      ]
    }
  ];
}

function parseSegment(input, fallback = []) {
  const parts = input
    .split(/[\/|,-]/)
    .map((part) => part.trim())
    .filter(Boolean);

  return [...parts, ...fallback].slice(0, Math.max(parts.length, fallback.length));
}

async function createOrder({ guild, member, settings, type, payload }) {
  if (settings.featureFlags.preventDuplicateActiveOrders) {
    const activeOrder = await Order.findOne({
      guildId: guild.id,
      customerId: member.id,
      status: { $nin: ['Closed', 'Cancelled', 'Delivered'] }
    });

    if (activeOrder) {
      throw new Error(`You already have an active order lounge: ${activeOrder.orderId}`);
    }
  }

  const sequence = await getNextSequence(guild.id, 'order');
  const orderId = generateOrderId(sequence);
  const [productName, category] = parseSegment(payload.productSummary);
  const [size, color, quantityRaw] = parseSegment(payload.sizeColorQty);
  const [paymentMethod, region] = parseSegment(payload.paymentRegion);
  const quantity = Number.parseInt(quantityRaw || '1', 10) || 1;
  const accountAgeDays = Math.floor((Date.now() - member.user.createdTimestamp) / 86400000);

  const channel = await guild.channels.create({
    name: generateOrderChannelName(sequence),
    type: ChannelType.GuildText,
    parent: settings.categoryIds?.orders || null,
    permissionOverwrites: buildOrderOverwrites(guild, member.id, settings)
  });

  const order = await Order.create({
    guildId: guild.id,
    orderId,
    customerId: member.id,
    customerTag: member.user.tag,
    ticketChannelId: channel.id,
    type,
    customerName: payload.customerName,
    productName,
    category,
    size,
    color,
    quantity,
    paymentMethod,
    region,
    deliveryNote: payload.deliveryNote,
    extraRequest: payload.extraRequest,
    status: 'Pending Review',
    timeline: [{ status: 'Pending Review', actorId: member.id, note: 'Order created' }],
    security: {
      accountAgeDays,
      flagged: accountAgeDays < 7,
      reason: accountAgeDays < 7 ? 'Young account' : null
    }
  });

  await incrementUserMetric(guild.id, member.id, 'orderCount', 'lastOrderAt');
  await channel.send({
    content: `<@${member.id}> Your request has been recorded successfully. A specialist will assist you shortly.`,
    embeds: [orderSummaryEmbed(order)],
    components: orderActionRows(order.orderId)
  });

  await writeGuildLog(guild, settings, 'order', 'Order Created', `A new order lounge was created for ${member.user.tag}.`, [
    { name: 'Order ID', value: order.orderId, inline: true },
    { name: 'Client', value: `<@${member.id}>`, inline: true },
    { name: 'Status', value: order.status, inline: true }
  ]);

  if (order.security.flagged) {
    await writeGuildLog(guild, settings, 'security', 'Account Age Warning', `Order ${order.orderId} was created by a newly created account.`, [
      { name: 'Account Age', value: `${accountAgeDays} day(s)`, inline: true }
    ]);
  }

  return { order, channel };
}

async function getOrderForViewer(guildId, orderId, viewerId, isStaff) {
  const order = await Order.findOne({ guildId, orderId });

  if (!order) {
    return null;
  }

  if (!isStaff && order.customerId !== viewerId) {
    throw new Error('You may only view the status of your own orders.');
  }

  return order;
}

async function updateOrderStatus({ guild, settings, orderId, action, actorId }) {
  const order = await Order.findOne({ guildId: guild.id, orderId });

  if (!order) {
    throw new Error('Order not found.');
  }

  if (action === 'claim') {
    if (order.claimedBy && order.claimedBy !== actorId) {
      throw new Error('This order has already been claimed by another specialist.');
    }

    order.claimedBy = actorId;
    order.claimedAt = new Date();
    order.assignedStaffId = actorId;
    order.status = 'Assigned to Agent';
  } else {
    const statusMap = {
      awaiting_payment: 'Awaiting Payment',
      payment_verified: 'Payment Verified',
      confirmed: 'Confirmed',
      processing: 'Processing',
      delivered: 'Delivered',
      cancelled: 'Cancelled',
      close: 'Closed'
    };

    order.status = statusMap[action];
  }

  if (action === 'payment_verified') {
    order.paymentVerifiedAt = new Date();
  }

  if (action === 'confirmed') {
    order.confirmedAt = new Date();
  }

  if (action === 'delivered') {
    order.deliveredAt = new Date();
  }

  if (action === 'cancelled') {
    order.cancelledAt = new Date();
  }

  if (action === 'close') {
    order.closedAt = new Date();
  }

  order.timeline.push({ status: order.status, actorId, note: `Action: ${action}` });
  await order.save();

  await writeGuildLog(guild, settings, action.includes('payment') ? 'payment' : 'order', 'Order Updated', `Order ${order.orderId} is now ${order.status}.`, [
    { name: 'Handled By', value: `<@${actorId}>`, inline: true }
  ]);

  await recordStaffAction({
    guildId: guild.id,
    staffId: actorId,
    actionType: `order_${action}`,
    targetId: order.orderId,
    targetModel: 'Order',
    metadata: { status: order.status }
  });

  const channel =
    guild.channels.cache.get(order.ticketChannelId) || (await guild.channels.fetch(order.ticketChannelId).catch(() => null));

  if (channel?.isTextBased()) {
    await channel.send({
      embeds: [orderSummaryEmbed(order)],
      components: order.status === 'Closed' ? [] : orderActionRows(order.orderId)
    });
  }

  return order;
}

async function addOrderNote(guildId, orderId, staffId, content) {
  return Order.findOneAndUpdate(
    { guildId, orderId },
    { $push: { notes: { staffId, content } } },
    { new: true }
  );
}

async function closeOrder({ guild, settings, orderId, actorId }) {
  const order = await updateOrderStatus({ guild, settings, orderId, action: 'close', actorId });
  const channel =
    guild.channels.cache.get(order.ticketChannelId) || (await guild.channels.fetch(order.ticketChannelId).catch(() => null));

  if (channel?.isTextBased()) {
    const transcript = await createTranscriptRecord({
      guild,
      settings,
      channel,
      refType: 'order',
      refId: order.orderId,
      closedBy: actorId
    });

    order.transcriptId = transcript.id;
    await order.save();
    await channel.permissionOverwrites.edit(order.customerId, { SendMessages: false }).catch(() => null);
    await channel.send('This order lounge has been archived. Thank you for choosing Luxénza.');
  }

  return order;
}

async function getOpenOrderSummary(guildId) {
  const [openOrders, awaitingPayment, vipPriority] = await Promise.all([
    Order.countDocuments({ guildId, status: { $nin: ['Closed', 'Cancelled', 'Delivered'] } }),
    Order.countDocuments({ guildId, status: 'Awaiting Payment' }),
    Order.countDocuments({ guildId, 'security.flagged': true, status: { $nin: ['Closed', 'Cancelled'] } })
  ]);

  return { openOrders, awaitingPayment, flaggedOrders: vipPriority };
}

module.exports = {
  addOrderNote,
  closeOrder,
  createOrder,
  getOpenOrderSummary,
  getOrderForViewer,
  updateOrderStatus
};
