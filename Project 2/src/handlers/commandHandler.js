const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');

function getFiles(directory) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return getFiles(fullPath);
    }

    return entry.name.endsWith('.js') ? [fullPath] : [];
  });
}

function loadCommands(client, commandsPath) {
  client.commands = new Collection();
  const files = getFiles(commandsPath);

  files.forEach((file) => {
    const command = require(file);

    if (command?.data && command?.execute) {
      client.commands.set(command.data.name, command);
    }
  });
}

module.exports = { getFiles, loadCommands };
