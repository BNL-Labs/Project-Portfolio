function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function formatMoney(value, currency = "MAD") {
  return `${roundMoney(value).toFixed(2)} ${currency}`;
}

function formatEta(hours) {
  const rounded = Math.max(1, Math.round(Number(hours) || 0));
  if (rounded < 24) {
    return `${rounded}h`;
  }

  const days = Math.floor(rounded / 24);
  const remainder = rounded % 24;
  return remainder ? `${days}d ${remainder}h` : `${days}d`;
}

function progressBar(percent, size = 12) {
  const normalized = Math.max(0, Math.min(100, Math.round(percent || 0)));
  const filled = Math.round((normalized / 100) * size);
  return `[${"#".repeat(filled)}${"-".repeat(size - filled)}] ${normalized}%`;
}

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

function sanitizeChannelName(value) {
  return String(value || "ticket")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 80);
}

function truncate(value, max = 1024) {
  const text = String(value || "");
  if (text.length <= max) {
    return text;
  }

  return `${text.slice(0, max - 3)}...`;
}

module.exports = {
  roundMoney,
  formatMoney,
  formatEta,
  progressBar,
  normalizeKey,
  sanitizeChannelName,
  truncate
};
