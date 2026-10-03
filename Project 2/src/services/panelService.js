const { buildVerificationPanel } = require('../panels/verificationPanel');
const { buildRoleSelectionPanel } = require('../panels/roleSelectionPanel');
const { buildOrderPanel } = require('../panels/orderPanel');
const { buildSupportPanel } = require('../panels/supportPanel');
const { buildReviewPanel } = require('../panels/reviewPanel');
const { buildStatusPanel } = require('../panels/statusPanel');
const { buildStaffPanel } = require('../panels/staffPanel');
const { setPanelMessage } = require('./settingsService');

const PANEL_MAP = [
  { panelKey: 'verification', channelKey: 'startHere', builder: buildVerificationPanel },
  { panelKey: 'roleSelection', channelKey: 'roleSelection', builder: buildRoleSelectionPanel },
  { panelKey: 'order', channelKey: 'placeOrder', builder: buildOrderPanel },
  { panelKey: 'support', channelKey: 'orderSupport', builder: buildSupportPanel },
  { panelKey: 'review', channelKey: 'leaveReview', builder: buildReviewPanel },
  { panelKey: 'orderStatus', channelKey: 'orderStatus', builder: buildStatusPanel },
  { panelKey: 'staff', channelKey: 'manageOrders', builder: buildStaffPanel }
];

async function upsertPanelMessage(guild, channelId, existingMessageId, payload) {
  const channel = guild.channels.cache.get(channelId) || (await guild.channels.fetch(channelId).catch(() => null));

  if (!channel || !channel.isTextBased()) {
    return null;
  }

  let message = null;

  if (existingMessageId) {
    message = await channel.messages.fetch(existingMessageId).catch(() => null);
  }

  if (message) {
    await message.edit(payload);
    return message.id;
  }

  const created = await channel.send(payload);
  return created.id;
}

async function syncPanels(guild, settings) {
  const synced = [];

  for (const panel of PANEL_MAP) {
    const channelId = settings.channelIds?.[panel.channelKey];

    if (!channelId) {
      continue;
    }

    const messageId = await upsertPanelMessage(
      guild,
      channelId,
      settings.panelMessages?.[panel.panelKey],
      panel.builder(settings)
    );

    if (messageId) {
      synced.push(panel.panelKey);
      await setPanelMessage(guild.id, panel.panelKey, messageId);
    }
  }

  return synced;
}

module.exports = { syncPanels };
