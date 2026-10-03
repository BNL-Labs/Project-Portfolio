require('dotenv').config();

const path = require('node:path');
const { REST, Routes } = require('discord.js');

const { getFiles } = require('../src/handlers/commandHandler');

async function main() {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const token = process.env.DISCORD_TOKEN;
  const defaultGuildId = process.env.DEFAULT_GUILD_ID;

  if (!clientId || !token) {
    throw new Error('DISCORD_CLIENT_ID and DISCORD_TOKEN are required.');
  }

  const commandFiles = getFiles(path.join(__dirname, '..', 'src', 'commands'));
  const commands = commandFiles.map((file) => require(file).data.toJSON());
  const rest = new REST({ version: '10' }).setToken(token);

  if (defaultGuildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, defaultGuildId), {
      body: commands
    });
    console.log(`Registered ${commands.length} guild commands for ${defaultGuildId}.`);
    return;
  }

  await rest.put(Routes.applicationCommands(clientId), { body: commands });
  console.log(`Registered ${commands.length} global commands.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
