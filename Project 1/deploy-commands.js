// File: deploy-commands.js
import { REST, Routes } from 'discord.js';
import { readdirSync } from 'fs';
import { createRequire } from 'module';

// Allow loading config.json in an ES module environment
const require = createRequire(import.meta.url);
const config = require('./config.json');

// Load command files
const commands = [];
const commandFiles = readdirSync('./commands').filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = await import(`./commands/${file}`);
  commands.push(command.default.data.toJSON());
}

// Register slash commands
const rest = new REST({ version: '10' }).setToken(config.token);

try {
  console.log('🔄 Deploying slash commands...');
  await rest.put(
    Routes.applicationGuildCommands(config.clientId, config.guildId),
    { body: commands }
  );
  console.log('✅ Successfully registered slash commands!');
} catch (error) {
  console.error('❌ Error registering commands:', error);
}
