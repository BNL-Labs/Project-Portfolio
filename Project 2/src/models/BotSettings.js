const mongoose = require('mongoose');
const { createDefaultSettings } = require('../config/defaultSettings');

const botSettingsSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, unique: true },
    channelIds: { type: Object, default: () => createDefaultSettings().channelIds },
    categoryIds: { type: Object, default: () => createDefaultSettings().categoryIds },
    roleIds: { type: Object, default: () => createDefaultSettings().roleIds },
    logChannelIds: { type: Object, default: () => createDefaultSettings().logChannelIds },
    transcriptChannelId: { type: String, default: null },
    panelMessages: { type: Object, default: () => createDefaultSettings().panelMessages },
    sequences: { type: Object, default: () => createDefaultSettings().sequences },
    featureFlags: { type: Object, default: () => createDefaultSettings().featureFlags }
  },
  { timestamps: true }
);

module.exports = mongoose.model('BotSettings', botSettingsSchema);
