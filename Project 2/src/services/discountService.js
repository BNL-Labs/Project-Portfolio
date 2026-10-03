const Discount = require('../models/Discount');
const { announcementEmbed } = require('../utils/embedFactory');
const { writeGuildLog } = require('./loggingService');

function buildDiscountId() {
  return `DISC-${Date.now().toString().slice(-6)}`;
}

async function createDiscount({ guild, settings, actorId, payload }) {
  const discount = await Discount.create({
    guildId: guild.id,
    discountId: buildDiscountId(),
    title: payload.title,
    description: payload.description,
    percent: payload.percent,
    code: payload.code,
    durationText: payload.durationText,
    targetChannelId: payload.targetChannelId,
    eligibleRoleId: payload.eligibleRoleId,
    createdBy: actorId,
    endsAt: payload.endsAt || null
  });

  await writeGuildLog(guild, settings, 'staffAction', 'Discount Created', `Discount ${discount.discountId} is active.`, [
    { name: 'Code', value: discount.code || 'Not provided', inline: true },
    { name: 'Percent', value: `${discount.percent}%`, inline: true }
  ]);

  return discount;
}

async function listActiveDiscounts(guildId) {
  return Discount.find({ guildId, status: 'active' }).sort({ createdAt: -1 });
}

async function endDiscount(guildId, discountId) {
  return Discount.findOneAndUpdate(
    { guildId, discountId },
    { $set: { status: 'inactive', endsAt: new Date() } },
    { new: true }
  );
}

async function broadcastCampaign({ guild, discount, type = 'Exclusive Drop' }) {
  const channel =
    guild.channels.cache.get(discount.targetChannelId) ||
    (await guild.channels.fetch(discount.targetChannelId).catch(() => null));

  if (!channel?.isTextBased()) {
    throw new Error('Target channel is unavailable for campaign broadcast.');
  }

  const embed = announcementEmbed({
    title: discount.title,
    subtitle: 'Private client campaign',
    description: discount.description,
    ctaText: discount.code ? `Use code ${discount.code} with our concierge team.` : 'Reach out to our concierge team to secure access.',
    code: discount.code,
    percent: discount.percent,
    type
  });

  const sent = await channel.send({ embeds: [embed] });
  discount.broadcastMessageId = sent.id;
  await discount.save();

  return sent;
}

module.exports = {
  broadcastCampaign,
  createDiscount,
  endDiscount,
  listActiveDiscounts
};
