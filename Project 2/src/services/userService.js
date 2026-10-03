const User = require('../models/User');

async function upsertUserProfile(member, updates = {}) {
  return User.findOneAndUpdate(
    { guildId: member.guild.id, userId: member.id },
    {
      $set: {
        username: member.user.username,
        displayName: member.displayName,
        ...updates
      }
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
}

async function incrementUserMetric(guildId, userId, field, dateField) {
  const update = { $inc: { [field]: 1 } };

  if (dateField) {
    update.$set = { [dateField]: new Date() };
  }

  return User.findOneAndUpdate({ guildId, userId }, update, { new: true, upsert: true, setDefaultsOnInsert: true });
}

async function setVipStatus(guildId, userId, vip) {
  return User.findOneAndUpdate({ guildId, userId }, { $set: { vip } }, { new: true, upsert: true, setDefaultsOnInsert: true });
}

async function appendClientNote(guildId, userId, note) {
  return User.findOneAndUpdate(
    { guildId, userId },
    {
      $push: { notes: note }
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
}

async function getClientProfile(guildId, userId) {
  return User.findOne({ guildId, userId });
}

module.exports = {
  appendClientNote,
  getClientProfile,
  incrementUserMetric,
  setVipStatus,
  upsertUserProfile
};
