const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    guildId: { type: String, required: true, index: true },
    reviewId: { type: String, required: true, unique: true },
    orderId: { type: String, required: true, index: true },
    userId: { type: String, required: true, index: true },
    rating: { type: Number, min: 1, max: 5, required: true },
    reviewText: { type: String, required: true },
    recommend: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    postedChannelId: String
  },
  { timestamps: true }
);

module.exports = mongoose.model('Review', reviewSchema);
