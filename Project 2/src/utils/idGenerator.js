function generateOrderId(sequence) {
  return `LX-${String(sequence).padStart(4, '0')}`;
}

function generateOrderChannelName(sequence) {
  return `order-lx-${String(sequence).padStart(4, '0')}`;
}

function generateSupportId(sequence) {
  return `LX-S${String(sequence).padStart(4, '0')}`;
}

function generateSupportChannelName(sequence) {
  return `support-lx-${String(sequence).padStart(4, '0')}`;
}

function generateReviewId(orderId, userId) {
  return `REV-${orderId}-${userId.slice(-4)}`;
}

module.exports = {
  generateOrderChannelName,
  generateOrderId,
  generateReviewId,
  generateSupportChannelName,
  generateSupportId
};
