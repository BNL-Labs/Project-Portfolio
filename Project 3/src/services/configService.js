const fs = require("node:fs");
const path = require("node:path");

class ConfigService {
  constructor(rootPath, env = process.env) {
    this.rootPath = rootPath;
    this.env = env;
    this.filePath = path.resolve(rootPath, env.CONFIG_PATH || "./config/settings.json");
    this.settings = null;
    this.load();
  }

  load() {
    const filePath = fs.existsSync(this.filePath)
      ? this.filePath
      : path.resolve(this.rootPath, "./config/settings.example.json");
    const raw = fs.readFileSync(filePath, "utf8");
    const parsed = JSON.parse(raw);
    this.settings = this.applyEnvOverrides(parsed);
    return this.settings;
  }

  reload() {
    return this.load();
  }

  get() {
    return this.settings;
  }

  applyEnvOverrides(settings) {
    const clone = JSON.parse(JSON.stringify(settings));
    if (this.env.LOGS_CHANNEL_ID) {
      clone.channels.logsChannelId = this.env.LOGS_CHANNEL_ID;
    }
    if (this.env.FEEDBACK_CHANNEL_ID) {
      clone.channels.feedbackChannelId = this.env.FEEDBACK_CHANNEL_ID;
    }
    if (this.env.PANEL_CHANNEL_ID) {
      clone.channels.panelChannelId = this.env.PANEL_CHANNEL_ID;
    }
    if (this.env.TICKET_CATEGORY_ID) {
      clone.tickets.categoryId = this.env.TICKET_CATEGORY_ID;
    }
    if (this.env.ARCHIVE_CATEGORY_ID) {
      clone.tickets.archiveCategoryId = this.env.ARCHIVE_CATEGORY_ID;
    }
    if (this.env.STAFF_ROLE_IDS) {
      clone.roles.staffRoleIds = this.env.STAFF_ROLE_IDS.split(",").map((value) => value.trim());
    }
    if (this.env.MANAGER_ROLE_IDS) {
      clone.roles.managerRoleIds = this.env.MANAGER_ROLE_IDS.split(",").map((value) => value.trim());
    }
    return clone;
  }
}

module.exports = ConfigService;
