const { isBlacklisted } = require('./blacklistService');

const bucketStore = new Map();

function enforceRateLimit({ guildId, userId, action, limit, windowMs }) {
  const now = Date.now();
  const key = `${guildId}:${userId}:${action}`;
  const entry = bucketStore.get(key) || [];
  const active = entry.filter((stamp) => now - stamp < windowMs);

  if (active.length >= limit) {
    return false;
  }

  active.push(now);
  bucketStore.set(key, active);
  return true;
}

async function assertCanProceed(guildId, userId, settings, action) {
  if (await isBlacklisted(guildId, userId)) {
    return { allowed: false, reason: 'Your access to concierge requests is currently restricted.' };
  }

  if (settings?.featureFlags?.panicMode) {
    return { allowed: false, reason: 'Concierge operations are temporarily paused for security review.' };
  }

  if (action === 'order' && settings?.featureFlags?.ordersLocked) {
    return { allowed: false, reason: 'Ordering is temporarily closed while our team updates availability.' };
  }

  return { allowed: true };
}

module.exports = {
  assertCanProceed,
  enforceRateLimit
};
