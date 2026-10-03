async function safeReply(interaction, options) {
  if (interaction.replied || interaction.deferred) {
    return interaction.followUp(options);
  }

  return interaction.reply(options);
}

module.exports = { safeReply };
