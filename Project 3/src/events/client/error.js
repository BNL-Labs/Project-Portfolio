module.exports = {
  name: "error",
  async execute(_client, error) {
    console.error("Discord client error:", error);
  }
};
