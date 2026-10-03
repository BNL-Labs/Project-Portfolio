const fs = require('node:fs');
const path = require('node:path');

function loadEvents(client, eventsPath) {
  const files = fs.readdirSync(eventsPath).filter((file) => file.endsWith('.js'));

  files.forEach((file) => {
    const event = require(path.join(eventsPath, file));

    if (event.once) {
      client.once(event.name, (...args) => event.execute(client, ...args));
      return;
    }

    client.on(event.name, (...args) => event.execute(client, ...args));
  });
}

module.exports = { loadEvents };
