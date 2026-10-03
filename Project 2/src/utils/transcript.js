async function buildTranscript(channel) {
  const messages = [];
  let lastId;

  while (true) {
    const batch = await channel.messages.fetch({ limit: 100, before: lastId });

    if (!batch.size) {
      break;
    }

    messages.push(...batch.values());
    lastId = batch.last().id;

    if (batch.size < 100) {
      break;
    }
  }

  const ordered = messages.sort((a, b) => a.createdTimestamp - b.createdTimestamp);
  return ordered
    .map((message) => {
      const content = message.content || '[Attachment or embed only]';
      return `[${new Date(message.createdTimestamp).toISOString()}] ${message.author.tag}: ${content}`;
    })
    .join('\n');
}

module.exports = { buildTranscript };
