const { ActivityType } = require('discord.js');
const { logger } = require('../utils/logger');

module.exports = {
  name: 'ready',
  once: true,
  async execute(client) {
    logger.info(`Ready as ${client.user.tag}`);

    client.user.setPresence({
      activities: [
        {
          name: 'private client journeys',
          type: ActivityType.Watching
        }
      ],
      status: 'online'
    });
  }
};
