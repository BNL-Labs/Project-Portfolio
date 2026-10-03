const { OWNER_ROLE_KEYS, STAFF_ROLE_KEYS } = require('../config/constants');
const { errorEmbed } = require('../utils/embedFactory');
const { safeReply } = require('../utils/safeReply');

function getRoleIdSet(settings, keys) {
  return new Set(keys.map((key) => settings?.roleIds?.[key]).filter(Boolean));
}

function memberHasRole(member, roleIds) {
  if (!member || !roleIds.size) {
    return false;
  }

  return member.roles.cache.some((role) => roleIds.has(role.id));
}

function isOwnerMember(member, settings) {
  if (!member) {
    return false;
  }

  if (member.permissions.has('Administrator')) {
    return true;
  }

  return memberHasRole(member, getRoleIdSet(settings, OWNER_ROLE_KEYS));
}

function isStaffMember(member, settings) {
  if (!member) {
    return false;
  }

  if (isOwnerMember(member, settings)) {
    return true;
  }

  return memberHasRole(member, getRoleIdSet(settings, STAFF_ROLE_KEYS));
}

async function enforceAccess(interaction, settings, mode = 'public') {
  const ownerUserId = interaction.client?.config?.ownerUserId;

  if (mode === 'owner' && ownerUserId && interaction.user.id === ownerUserId) {
    return true;
  }

  if (mode === 'owner' && !isOwnerMember(interaction.member, settings)) {
    await safeReply(interaction, {
      embeds: [errorEmbed('Restricted Access', 'This concierge control is reserved for the ownership team.')],
      ephemeral: true
    });
    return false;
  }

  if (mode === 'staff' && !isStaffMember(interaction.member, settings)) {
    await safeReply(interaction, {
      embeds: [errorEmbed('Restricted Access', 'This control panel is reserved for authorized Luxénza staff.')],
      ephemeral: true
    });
    return false;
  }

  return true;
}

module.exports = {
  enforceAccess,
  isOwnerMember,
  isStaffMember
};
