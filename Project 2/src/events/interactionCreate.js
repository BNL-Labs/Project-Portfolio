const { getGuildSettings } = require('../services/settingsService');
const { enforceAccess, isOwnerMember, isStaffMember } = require('../middleware/accessControl');
const { resolveComponent } = require('../handlers/componentHandler');
const { errorEmbed } = require('../utils/embedFactory');
const { safeReply } = require('../utils/safeReply');
const { logRuntimeError } = require('../services/loggingService');

module.exports = {
  name: 'interactionCreate',
  async execute(client, interaction) {
    if (!interaction.inGuild()) {
      return;
    }

    const settings = await getGuildSettings(interaction.guildId);

    try {
      if (interaction.isAutocomplete()) {
        const command = client.commands.get(interaction.commandName);

        if (!command?.autocomplete) {
          return;
        }

        if (command.ownerOnly && !isOwnerMember(interaction.member, settings)) {
          await interaction.respond([]);
          return;
        }

        if (command.staffOnly && !isStaffMember(interaction.member, settings)) {
          await interaction.respond([]);
          return;
        }

        await command.autocomplete(interaction, settings);
        return;
      }

      if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);

        if (!command) {
          return;
        }

        const accessMode = command.ownerOnly ? 'owner' : command.staffOnly ? 'staff' : 'public';

        if (!(await enforceAccess(interaction, settings, accessMode))) {
          return;
        }

        await command.execute(client, interaction, settings);
        return;
      }

      if (interaction.isButton()) {
        const handler = resolveComponent(client.buttons, interaction.customId);

        if (!handler) {
          return;
        }

        const accessMode = handler.ownerOnly ? 'owner' : handler.staffOnly ? 'staff' : 'public';

        if (!(await enforceAccess(interaction, settings, accessMode))) {
          return;
        }

        await handler.execute(client, interaction, settings);
        return;
      }

      if (interaction.isStringSelectMenu()) {
        const handler = resolveComponent(client.selects, interaction.customId);

        if (!handler) {
          return;
        }

        const accessMode = handler.ownerOnly ? 'owner' : handler.staffOnly ? 'staff' : 'public';

        if (!(await enforceAccess(interaction, settings, accessMode))) {
          return;
        }

        await handler.execute(client, interaction, settings);
        return;
      }

      if (interaction.isModalSubmit()) {
        const handler = resolveComponent(client.modals, interaction.customId);

        if (!handler) {
          return;
        }

        const accessMode = handler.ownerOnly ? 'owner' : handler.staffOnly ? 'staff' : 'public';

        if (!(await enforceAccess(interaction, settings, accessMode))) {
          return;
        }

        await handler.execute(client, interaction, settings);
      }
    } catch (error) {
      logRuntimeError('Interaction failure', error);
      await safeReply(interaction, {
        embeds: [
          errorEmbed(
            'Concierge Interruption',
            'We encountered a temporary issue while processing your request. Please try again in a moment.'
          )
        ],
        ephemeral: true
      }).catch(() => null);
    }
  }
};
