const BotSettings = require('../models/BotSettings');
const { createDefaultSettings } = require('../config/defaultSettings');

const cache = new Map();

async function getGuildSettings(guildId) {
  if (cache.has(guildId)) {
    return cache.get(guildId);
  }

  let settings = await BotSettings.findOne({ guildId });

  if (!settings) {
    settings = await BotSettings.create(createDefaultSettings(guildId));
  }

  cache.set(guildId, settings);
  return settings;
}

async function refreshGuildSettings(guildId) {
  const settings = await BotSettings.findOne({ guildId });
  cache.set(guildId, settings);
  return settings;
}

async function setPathValue(guildId, scope, key, value) {
  await BotSettings.updateOne(
    { guildId },
    {
      $set: {
        [`${scope}.${key}`]: value
      }
    },
    { upsert: true }
  );

  return refreshGuildSettings(guildId);
}

async function setTranscriptChannel(guildId, channelId) {
  await BotSettings.updateOne({ guildId }, { $set: { transcriptChannelId: channelId } }, { upsert: true });
  return refreshGuildSettings(guildId);
}

async function setFeatureFlag(guildId, flag, value) {
  await BotSettings.updateOne(
    { guildId },
    {
      $set: {
        [`featureFlags.${flag}`]: value
      }
    },
    { upsert: true }
  );

  return refreshGuildSettings(guildId);
}

async function setPanelMessage(guildId, panelKey, messageId) {
  await BotSettings.updateOne(
    { guildId },
    {
      $set: {
        [`panelMessages.${panelKey}`]: messageId
      }
    }
  );

  return refreshGuildSettings(guildId);
}

async function getNextSequence(guildId, type) {
  const settings = await BotSettings.findOneAndUpdate(
    { guildId },
    {
      $inc: {
        [`sequences.${type}`]: 1
      }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  cache.set(guildId, settings);
  return settings.sequences[type];
}

module.exports = {
  getGuildSettings,
  getNextSequence,
  refreshGuildSettings,
  setFeatureFlag,
  setPanelMessage,
  setPathValue,
  setTranscriptChannel
};
