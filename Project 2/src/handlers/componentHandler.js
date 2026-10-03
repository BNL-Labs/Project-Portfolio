const fs = require('node:fs');
const path = require('node:path');
const { Collection } = require('discord.js');

function loadComponents(client, basePath, type) {
  const directory = path.join(basePath, type);
  const files = fs.readdirSync(directory).filter((file) => file.endsWith('.js'));
  client[type] = new Collection();

  files.forEach((file) => {
    const handler = require(path.join(directory, file));

    if (handler?.customId || handler?.prefix) {
      client[type].set(handler.customId || handler.prefix, handler);
    }
  });
}

function resolveComponent(collection, customId) {
  if (collection.has(customId)) {
    return collection.get(customId);
  }

  return collection.find((handler) => handler.prefix && customId.startsWith(handler.prefix));
}

module.exports = {
  loadComponents,
  resolveComponent
};
