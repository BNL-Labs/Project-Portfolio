const { ChannelType, PermissionFlagsBits } = require('discord.js');

const Ticket = require('../models/Ticket');
const { STAFF_ROLE_KEYS } = require('../config/constants');
const { createTranscriptRecord } = require('./transcriptService');
const { getNextSequence } = require('./settingsService');
const { appendClientNote, getClientProfile, incrementUserMetric } = require('./userService');
const { generateSupportChannelName, generateSupportId } = require('../utils/idGenerator');
const { supportSummaryEmbed, ticketActionRows } = require('../utils/embedFactory');
const { recordStaffAction, writeGuildLog } = require('./loggingService');

function getStaffRoleIds(settings) {
  return STAFF_ROLE_KEYS.map((key) => settings.roleIds?.[key]).filter(Boolean);
}

function buildTicketOverwrites(guild, userId, settings) {
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

async function createSupportTicket({ guild, member, settings, type, payload }) {
  const sequence = await getNextSequence(guild.id, 'support');
  const ticketId = generateSupportId(sequence);
  const profile = await getClientProfile(guild.id, member.id);
  const vip = Boolean(profile?.vip || member.roles.cache.has(settings.roleIds?.vipClient));
  const priority = vip || type === 'VIP Assistance' ? 'VIP priority' : 'normal';

  const channel = await guild.channels.create({
    name: generateSupportChannelName(sequence),
    type: ChannelType.GuildText,
    parent: settings.categoryIds?.support || null,
    permissionOverwrites: buildTicketOverwrites(guild, member.id, settings)
  });

  const ticket = await Ticket.create({
    guildId: guild.id,
    ticketId,
    userId: member.id,
    userTag: member.user.tag,
    channelId: channel.id,
    type,
    subject: payload.subject,
    details: payload.details,
    orderReference: payload.orderReference,
    priority,
    vip,
    timeline: [{ action: 'created', actorId: member.id, note: 'Support ticket created' }]
  });

  await incrementUserMetric(guild.id, member.id, 'supportCount', 'lastSupportAt');
  await channel.send({
    content: `<@${member.id}> Your support lounge is ready. A specialist will assist you shortly.`,
    embeds: [supportSummaryEmbed(ticket)],
    components: ticketActionRows(ticket.ticketId)
  });

  await writeGuildLog(guild, settings, 'support', 'Support Ticket Opened', `Support ticket ${ticket.ticketId} was created.`, [
    { name: 'Client', value: `<@${member.id}>`, inline: true },
    { name: 'Priority', value: priority, inline: true },
    { name: 'Type', value: type, inline: true }
  ]);

  return { ticket, channel };
}

async function claimTicket({ guild, settings, ticketId, actorId }) {
  const ticket = await Ticket.findOne({ guildId: guild.id, ticketId });

  if (!ticket) {
    throw new Error('Support ticket not found.');
  }

  if (ticket.claimedBy && ticket.claimedBy !== actorId) {
    throw new Error('This support lounge has already been claimed.');
  }

  ticket.claimedBy = actorId;
  ticket.claimedAt = new Date();
  ticket.status = 'claimed';
  ticket.timeline.push({ action: 'claimed', actorId, note: 'Ticket claimed by staff' });
  await ticket.save();

  await writeGuildLog(guild, settings, 'staffAction', 'Support Ticket Claimed', `${ticket.ticketId} has been claimed.`, [
    { name: 'Handled By', value: `<@${actorId}>`, inline: true }
  ]);

  return ticket;
}

async function setTicketPriority({ guild, settings, ticketId, actorId, priority }) {
  const ticket = await Ticket.findOne({ guildId: guild.id, ticketId });

  if (!ticket) {
    throw new Error('Support ticket not found.');
  }

  ticket.priority = priority;
  ticket.timeline.push({ action: 'priority_update', actorId, note: priority });
  await ticket.save();

  await writeGuildLog(guild, settings, 'support', 'Priority Updated', `${ticket.ticketId} priority set to ${priority}.`, [
    { name: 'Handled By', value: `<@${actorId}>`, inline: true }
  ]);

  return ticket;
}

async function addTicketNote({ guildId, ticketId, actorId, content }) {
  const ticket = await Ticket.findOne({ guildId, ticketId });

  if (!ticket) {
    throw new Error('Support ticket not found.');
  }

  await appendClientNote(guildId, ticket.userId, { staffId: actorId, content });
  ticket.notes.push({ staffId: actorId, content });
  ticket.timeline.push({ action: 'note_added', actorId, note: content });
  await ticket.save();
  return ticket;
}

async function closeTicket({ guild, settings, ticketId, actorId }) {
  const ticket = await Ticket.findOne({ guildId: guild.id, ticketId });

  if (!ticket) {
    throw new Error('Support ticket not found.');
  }

  ticket.status = 'closed';
  ticket.closedAt = new Date();
  ticket.timeline.push({ action: 'closed', actorId, note: 'Ticket closed' });
  await ticket.save();

  const channel =
    guild.channels.cache.get(ticket.channelId) || (await guild.channels.fetch(ticket.channelId).catch(() => null));

  if (channel?.isTextBased()) {
    const transcript = await createTranscriptRecord({
      guild,
      settings,
      channel,
      refType: 'support',
      refId: ticket.ticketId,
      closedBy: actorId
    });

    ticket.transcriptId = transcript.id;
    await ticket.save();
    await channel.permissionOverwrites.edit(ticket.userId, { SendMessages: false }).catch(() => null);
    await channel.send('This support lounge has been archived. Thank you for choosing Luxénza.');
  }

  await writeGuildLog(guild, settings, 'support', 'Support Ticket Closed', `${ticket.ticketId} has been closed.`, [
    { name: 'Handled By', value: `<@${actorId}>`, inline: true }
  ]);

  await recordStaffAction({
    guildId: guild.id,
    staffId: actorId,
    actionType: 'support_close',
    targetId: ticket.ticketId,
    targetModel: 'Ticket',
    metadata: { priority: ticket.priority }
  });

  return ticket;
}

async function getOpenSupportSummary(guildId) {
  const [openTickets, vipTickets] = await Promise.all([
    Ticket.countDocuments({ guildId, status: { $ne: 'closed' } }),
    Ticket.countDocuments({ guildId, status: { $ne: 'closed' }, priority: 'VIP priority' })
  ]);

  return { openTickets, vipTickets };
}

module.exports = {
  addTicketNote,
  claimTicket,
  closeTicket,
  createSupportTicket,
  getOpenSupportSummary,
  setTicketPriority
};
