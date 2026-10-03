const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

async function connectDatabase(uri) {
  if (!uri) {
    throw new Error('MONGODB_URI is missing.');
  }

  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  logger.info('Connected to MongoDB');
}

module.exports = { connectDatabase };
