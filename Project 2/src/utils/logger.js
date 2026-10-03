function line(level, message, meta) {
  const timestamp = new Date().toISOString();
  const suffix = meta ? ` ${JSON.stringify(meta)}` : '';
  console.log(`[${timestamp}] [${level}] ${message}${suffix}`);
}

const logger = {
  info(message, meta) {
    line('INFO', message, meta);
  },
  warn(message, meta) {
    line('WARN', message, meta);
  },
  error(message, meta) {
    line('ERROR', message, meta);
  }
};

module.exports = { logger };
