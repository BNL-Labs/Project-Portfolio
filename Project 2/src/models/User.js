const mongoose = require('mongoose');

const noteSchema = new mongoose.Schema(
  {
    staffId: String,
    content: String,
    createdAt: { type: Date, default: Date.now }
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    username: String,
    displayName: String,
    vip: { type: Boolean, default: false },
    paymentPreference: String,
    region: String,
    preference: String,
    orderCount: { type: Number, default: 0 },
    supportCount: { type: Number, default: 0 },
    reviewCount: { type: Number, default: 0 },
    lastOrderAt: Date,
    lastSupportAt: Date,
    notes: [noteSchema]
  },
  { timestamps: true }
);

userSchema.index({ guildId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('User', userSchema);
