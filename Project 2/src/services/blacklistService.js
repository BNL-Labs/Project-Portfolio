const Blacklist = require('../models/Blacklist');

async function addToBlacklist(guildId, userId, reason, addedBy) {
  return Blacklist.findOneAndUpdate(
    { guildId, userId },
    {
      $set: {
        reason,
        addedBy,
        active: true
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function removeFromBlacklist(guildId, userId) {
  return Blacklist.findOneAndUpdate({ guildId, userId }, { $set: { active: false } }, { new: true });
}

async function isBlacklisted(guildId, userId) {
  const record = await Blacklist.findOne({ guildId, userId, active: true });
  return Boolean(record);
}

module.exports = {
  addToBlacklist,
  isBlacklisted,
  removeFromBlacklist
};
