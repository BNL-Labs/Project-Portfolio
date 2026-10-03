const fs = require("node:fs");
const path = require("node:path");
const { Collection, REST, Routes } = require("discord.js");

function getCommandFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return getCommandFiles(fullPath);
    }
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

async function loadCommands(client, commandsPath) {
  client.commands = new Collection();
  const files = getCommandFiles(commandsPath);

  for (const file of files) {
    delete require.cache[require.resolve(file)];
    const command = require(file);
    client.commands.set(command.data.name, command);
  }
}

async function deployCommands(client, env) {
  if (String(env.AUTO_DEPLOY_COMMANDS).toLowerCase() === "false") {
    return;
  }

  const rest = new REST({ version: "10" }).setToken(env.DISCORD_TOKEN);
  const commandData = [...client.commands.values()].map((command) => command.data.toJSON());

  if (env.GUILD_ID) {
    await rest.put(
      Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID),
      { body: commandData }
    );
    return;
  }

  await rest.put(
    Routes.applicationCommands(env.CLIENT_ID),
    { body: commandData }
  );
}

module.exports = {
  loadCommands,
  deployCommands
};
