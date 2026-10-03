const mongoose = require('mongoose');

const staffActionSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    staffId: { type: String, required: true, index: true },
    actionType: { type: String, required: true },
    targetId: String,
    targetModel: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  { timestamps: true }
);

module.exports = mongoose.model('StaffAction', staffActionSchema);
