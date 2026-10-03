const mongoose = require('mongoose');
const { SUPPORT_PRIORITIES, SUPPORT_TYPES } = require('../config/constants');

const noteSchema = new mongoose.Schema(
  {
    staffId: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const timelineSchema = new mongoose.Schema(
  {
    action: String,
    actorId: String,
    note: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const ticketSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    ticketId: { type: String, required: true, unique: true },
    userId: { type: String, required: true, index: true },
    userTag: String,
    channelId: String,
    type: { type: String, enum: SUPPORT_TYPES, required: true },
    subject: String,
    details: String,
    orderReference: String,
    priority: { type: String, enum: SUPPORT_PRIORITIES, default: 'normal' },
    status: { type: String, enum: ['open', 'claimed', 'closed'], default: 'open' },
    claimedBy: String,
    claimedAt: Date,
    vip: { type: Boolean, default: false },
    notes: [noteSchema],
    timeline: [timelineSchema],
    transcriptId: String,
    closedAt: Date
  },
  { timestamps: true }
);

module.exports = mongoose.model('Ticket', ticketSchema);
