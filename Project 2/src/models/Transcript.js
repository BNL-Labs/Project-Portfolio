const mongoose = require('mongoose');

const transcriptSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    refType: { type: String, enum: ['order', 'support'], required: true },
    refId: { type: String, required: true, index: true },
    channelId: String,
    closedBy: String,
    transcriptMessageId: String,
    fileName: String,
    excerpt: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Transcript', transcriptSchema);
