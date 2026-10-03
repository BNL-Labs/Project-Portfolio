const mongoose = require('mongoose');

const blacklistSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    reason: { type: String, required: true },
    addedBy: String,
    active: { type: Boolean, default: true }
  },
  { timestamps: true }
);

blacklistSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('Blacklist', blacklistSchema);
