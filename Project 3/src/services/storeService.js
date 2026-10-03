const fs = require("node:fs");
const path = require("node:path");
const { DEFAULT_STORE } = require("../utils/constants");

class StoreService {
  constructor(rootPath, env = process.env) {
    this.filePath = path.resolve(rootPath, env.STORE_PATH || "./data/store.json");
    this.queue = Promise.resolve();
    this.state = null;
  }

  async init() {
    await fs.promises.mkdir(path.dirname(this.filePath), { recursive: true });
    if (!fs.existsSync(this.filePath)) {
      await fs.promises.writeFile(this.filePath, JSON.stringify(DEFAULT_STORE, null, 2));
    }
    const raw = await fs.promises.readFile(this.filePath, "utf8");
    this.state = raw.trim() ? JSON.parse(raw) : JSON.parse(JSON.stringify(DEFAULT_STORE));
    this.ensureShape();
  }

  ensureShape() {
    this.state.meta ||= { nextOrderNumber: 1, nextDraftNumber: 1 };
    this.state.drafts ||= {};
    this.state.orders ||= {};
    this.state.reviews ||= {};
  }

  read() {
    return this.state;
  }

  async update(mutator) {
    this.queue = this.queue.then(async () => {
      const draft = JSON.parse(JSON.stringify(this.state));
      const result = await mutator(draft);
      this.state = draft;
      this.ensureShape();
      await fs.promises.writeFile(this.filePath, JSON.stringify(this.state, null, 2));
      return result;
    });

    return this.queue;
  }
}

module.exports = StoreService;
