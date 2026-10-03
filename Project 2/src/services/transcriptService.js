const { AttachmentBuilder } = require('discord.js');

const Transcript = require('../models/Transcript');
const { buildTranscript } = require('../utils/transcript');

async function createTranscriptRecord({ guild, settings, channel, refType, refId, closedBy }) {
  const content = await buildTranscript(channel);
  const fileName = `${refType}-${refId}.txt`;
  let transcriptMessageId = null;

  if (settings?.transcriptChannelId) {
    const transcriptChannel =
      guild.channels.cache.get(settings.transcriptChannelId) ||
      (await guild.channels.fetch(settings.transcriptChannelId).catch(() => null));

    if (transcriptChannel?.isTextBased()) {
      const file = new AttachmentBuilder(Buffer.from(content, 'utf8'), { name: fileName });
      const sent = await transcriptChannel.send({
        content: `Transcript archived for ${refType.toUpperCase()} ${refId}`,
        files: [file]
      });
      transcriptMessageId = sent.id;
    }
  }

  return Transcript.create({
    guildId: guild.id,
    refType,
    refId,
    channelId: channel.id,
    closedBy,
    transcriptMessageId,
    fileName,
    excerpt: content.slice(0, 1000)
  });
}

module.exports = { createTranscriptRecord };
