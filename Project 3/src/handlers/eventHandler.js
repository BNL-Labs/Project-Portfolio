const fs = require("node:fs");
const path = require("node:path");

function getEventFiles(dirPath) {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  return entries.flatMap((entry) => {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      return getEventFiles(fullPath);
    }
    return entry.name.endsWith(".js") ? [fullPath] : [];
  });
}

async function loadEvents(client, eventsPath) {
  const files = getEventFiles(eventsPath);
  for (const file of files) {
    delete require.cache[require.resolve(file)];
    const event = require(file);
    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
    } else {
      client.on(event.name, (...args) => event.execute(client, ...args));
    }
  }
}

module.exports = {
  loadEvents
};
