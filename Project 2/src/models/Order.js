const mongoose = require('mongoose');
const { ORDER_STATUSES } = require('../config/constants');

const timelineSchema = new mongoose.Schema(
  {
    status: String,
    actorId: String,
    note: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const noteSchema = new mongoose.Schema(
  {
    staffId: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    orderId: { type: String, required: true, unique: true },
    customerId: { type: String, required: true, index: true },
    customerTag: String,
    ticketChannelId: String,
    type: { type: String, enum: ['new', 'custom', 'bulk', 'ask'], required: true },
    customerName: String,
    productName: String,
    category: String,
    size: String,
    color: String,
    quantity: { type: Number, default: 1 },
    paymentMethod: String,
    region: String,
    deliveryNote: String,
    extraRequest: String,
    status: { type: String, enum: ORDER_STATUSES, default: 'Pending Review' },
    claimedBy: String,
    claimedAt: Date,
    assignedStaffId: String,
    paymentVerifiedAt: Date,
    confirmedAt: Date,
    deliveredAt: Date,
    cancelledAt: Date,
    closedAt: Date,
    timeline: [timelineSchema],
    notes: [noteSchema],
    transcriptId: String,
    security: {
      accountAgeDays: Number,
      flagged: { type: Boolean, default: false },
      reason: String
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Order', orderSchema);
