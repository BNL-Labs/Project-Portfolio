class LoggingService {
  constructor(client, configService, embedService) {
    this.client = client;
    this.configService = configService;
    this.embedService = embedService;
  }

  async log(guild, payload) {
    const settings = this.configService.get();
    const channelId = settings.channels.logsChannelId;
    if (!guild || !channelId || channelId.startsWith("EDIT_")) {
      return;
    }

    const channel = guild.channels.cache.get(channelId) || await guild.channels.fetch(channelId).catch(() => null);
    if (!channel || !channel.isTextBased()) {
      return;
    }

    await channel.send({ embeds: [this.embedService.buildLogEmbed(payload)] }).catch(() => null);
  }
}

module.exports = LoggingService;
