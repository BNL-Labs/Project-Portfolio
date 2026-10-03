const mongoose = require('mongoose');

const discountSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    discountId: { type: String, required: true, unique: true },
    title: { type: String, required: true },
    description: String,
    percent: { type: Number, min: 1, max: 100, required: true },
    code: String,
    durationText: String,
    targetChannelId: String,
    eligibleRoleId: String,
    createdBy: String,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    startsAt: { type: Date, default: Date.now },
    endsAt: Date,
    broadcastMessageId: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Discount', discountSchema);
