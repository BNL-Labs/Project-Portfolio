const { PermissionFlagsBits } = require("discord.js");

function hasAnyRole(member, roleIds = []) {
  if (!member || !member.roles || !Array.isArray(roleIds) || roleIds.length === 0) {
    return false;
  }

  return roleIds.some((roleId) => member.roles.cache.has(roleId));
}

function isManager(member, settings) {
  if (!member) {
    return false;
  }

  return member.permissions.has(PermissionFlagsBits.Administrator) || hasAnyRole(member, settings.roles.managerRoleIds);
}

function isStaff(member, settings) {
  if (!member) {
    return false;
  }

  return isManager(member, settings) || hasAnyRole(member, settings.roles.staffRoleIds);
}

module.exports = {
  hasAnyRole,
  isStaff,
  isManager
};
