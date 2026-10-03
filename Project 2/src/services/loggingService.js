const StaffAction = require('../models/StaffAction');
const { logEmbed } = require('../utils/embedFactory');
const { logger } = require('../utils/logger');

async function postToLogChannel(guild, channelId, embed) {
  if (!channelId) {
    return null;
  }

  const channel = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));

  if (!channel || !channel.isTextBased()) {
    return null;
  }

  return channel.send({ embeds: [embed] }).catch(() => null);
}

async function writeGuildLog(guild, settings, key, title, description, details = []) {
  const embed = logEmbed(title, description, details);
  return postToLogChannel(guild, settings?.logChannelIds?.[key], embed);
}

async function recordStaffAction({ guildId, staffId, actionType, targetId, targetModel, metadata }) {
  if (!staffId) {
    return null;
  }

  return StaffAction.create({
    guildId,
    staffId,
    actionType,
    targetId,
    targetModel,
    metadata
  });
}

function logRuntimeError(message, error) {
  logger.error(message, { message: error.message, stack: error.stack });
}

module.exports = {
  logRuntimeError,
  recordStaffAction,
  writeGuildLog
};
