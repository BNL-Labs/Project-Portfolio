require('dotenv').config();

const path = require('node:path');
const { Client, GatewayIntentBits, Partials } = require('discord.js');

const { loadCommands } = require('./handlers/commandHandler');
const { loadComponents } = require('./handlers/componentHandler');
const { loadEvents } = require('./handlers/eventHandler');
const { connectDatabase } = require('./services/databaseService');
const { logger } = require('./utils/logger');

const requiredEnv = ['DISCORD_TOKEN', 'DISCORD_CLIENT_ID', 'MONGODB_URI'];
const missingEnv = requiredEnv.filter((key) => !process.env[key]);

if (missingEnv.length) {
  throw new Error(`Missing environment variables: ${missingEnv.join(', ')}`);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.DirectMessages
  ],
  partials: [Partials.Channel]
});

client.config = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.DISCORD_CLIENT_ID,
  ownerUserId: process.env.OWNER_USER_ID || null,
  verificationWelcomeDm: process.env.VERIFICATION_WELCOME_DM !== 'false',
  transcriptUploads: process.env.TRANSCRIPT_UPLOADS !== 'false',
  defaultGuildId: process.env.DEFAULT_GUILD_ID || null,
  prefix: process.env.BOT_PREFIX || '/'
};

async function bootstrap() {
  await connectDatabase(process.env.MONGODB_URI);

  loadCommands(client, path.join(__dirname, 'commands'));
  loadComponents(client, __dirname, 'buttons');
  loadComponents(client, __dirname, 'selects');
  loadComponents(client, __dirname, 'modals');
  loadEvents(client, path.join(__dirname, 'events'));

  await client.login(client.config.token);
}

bootstrap().catch((error) => {
  logger.error('Failed to bootstrap LX Concierge', { message: error.message, stack: error.stack });
  process.exit(1);
});
