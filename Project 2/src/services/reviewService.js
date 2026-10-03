const Review = require('../models/Review');
const Order = require('../models/Order');
const { generateReviewId } = require('../utils/idGenerator');
const { reviewEmbed } = require('../utils/embedFactory');
const { incrementUserMetric } = require('./userService');
const { writeGuildLog } = require('./loggingService');

async function submitReview({ guild, member, settings, payload }) {
  const order = await Order.findOne({ guildId: guild.id, orderId: payload.orderId });

  if (!order) {
    throw new Error('The provided order ID could not be found.');
  }

  if (order.customerId !== member.id) {
    throw new Error('You may only review your own orders.');
  }

  const review = await Review.create({
    guildId: guild.id,
    reviewId: generateReviewId(payload.orderId, member.id),
    orderId: payload.orderId,
    userId: member.id,
    rating: payload.rating,
    reviewText: payload.reviewText,
    recommend: payload.recommend,
    featured: payload.rating >= 4 && payload.recommend
  });

  await incrementUserMetric(guild.id, member.id, 'reviewCount');
  const testimonialsChannelId = settings.channelIds?.testimonials || settings.channelIds?.leaveReview;
  const channel =
    guild.channels.cache.get(testimonialsChannelId) || (await guild.channels.fetch(testimonialsChannelId).catch(() => null));

  if (channel?.isTextBased()) {
    const sent = await channel.send({ embeds: [reviewEmbed(review)] });
    review.postedChannelId = sent.channelId;
    await review.save();
  }

  if (settings.roleIds?.firstBuyer && !member.roles.cache.has(settings.roleIds.firstBuyer)) {
    await member.roles.add(settings.roleIds.firstBuyer).catch(() => null);
  }

  await writeGuildLog(guild, settings, 'staffAction', 'Review Submitted', `A client review was submitted for ${payload.orderId}.`, [
    { name: 'Client', value: `<@${member.id}>`, inline: true },
    { name: 'Rating', value: `${payload.rating}/5`, inline: true }
  ]);

  return review;
}

module.exports = { submitReview };
