const { ChannelType, PermissionFlagsBits } = require("discord.js");
const { sanitizeChannelName } = require("../utils/format");
const { TICKET_TYPE } = require("../utils/constants");

class TicketService {
  constructor(configService) {
    this.configService = configService;
  }

  getTicketOverwrites(guild, customerId) {
    const settings = this.configService.get();
    const overwrites = [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel]
      },
      {
        id: customerId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory]
      }
    ];

    for (const roleId of settings.roles.staffRoleIds) {
      overwrites.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
      });
    }

    for (const roleId of settings.roles.managerRoleIds) {
      overwrites.push({
        id: roleId,
        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.AttachFiles, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
      });
    }

    return overwrites;
  }

  async createOrderTicket(guild, order) {
    const settings = this.configService.get();
    const name = sanitizeChannelName(`${settings.tickets.orderPrefix}-${order.id.toLowerCase()}`);
    return guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: settings.tickets.categoryId && !settings.tickets.categoryId.startsWith("EDIT_") ? settings.tickets.categoryId : null,
      permissionOverwrites: this.getTicketOverwrites(guild, order.customerId),
      topic: `PL order ${order.id} | customer ${order.customerId}`
    });
  }

  async createSupportTicket(guild, customerId, type) {
    const settings = this.configService.get();
    const prefix = type === TICKET_TYPE.QUESTION ? settings.tickets.questionPrefix : settings.tickets.issuePrefix;
    const name = sanitizeChannelName(`${prefix}-${customerId}`);
    return guild.channels.create({
      name,
      type: ChannelType.GuildText,
      parent: settings.tickets.categoryId && !settings.tickets.categoryId.startsWith("EDIT_") ? settings.tickets.categoryId : null,
      permissionOverwrites: this.getTicketOverwrites(guild, customerId),
      topic: `${type} ticket | customer ${customerId}`
    });
  }

  async closeTicket(channel) {
    const settings = this.configService.get();
    if (settings.tickets.archiveCategoryId && !settings.tickets.archiveCategoryId.startsWith("EDIT_")) {
      await channel.setParent(settings.tickets.archiveCategoryId).catch(() => null);
      await channel.permissionOverwrites.edit(channel.guild.roles.everyone.id, { ViewChannel: false }).catch(() => null);
      await channel.setName(sanitizeChannelName(`closed-${channel.name}`)).catch(() => null);
      return;
    }

    await channel.delete("Ticket closed").catch(() => null);
  }

  async addUser(channel, userId) {
    await channel.permissionOverwrites.edit(userId, {
      ViewChannel: true,
      SendMessages: true,
      AttachFiles: true,
      ReadMessageHistory: true
    });
  }

  async removeUser(channel, userId) {
    await channel.permissionOverwrites.delete(userId).catch(() => null);
  }
}

module.exports = TicketService;
