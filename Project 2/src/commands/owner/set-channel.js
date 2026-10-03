const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');

const { CHANNEL_KEYS, LOG_KEYS } = require('../../config/constants');
const { setPathValue, setTranscriptChannel } = require('../../services/settingsService');
const { errorEmbed, successEmbed } = require('../../utils/embedFactory');

const choices = [
  ...CHANNEL_KEYS.map((item) => ({ name: item.label, value: `channel:${item.key}` })),
  ...LOG_KEYS.map((item) => ({ name: `${item.label}`, value: `log:${item.key}` })),
  { name: 'transcript-storage', value: 'transcript:channel' }
];

function isAssignableTextChannel(channel, member) {
  return Boolean(
    channel &&
      (channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) &&
      channel.permissionsFor(member)?.has(PermissionFlagsBits.ViewChannel)
  );
}

function normalizeChannelInput(value) {
  return String(value || '')
    .trim()
    .replace(/^<#(\d+)>$/, '$1')
    .replace(/^#/, '');
}

function formatChannelChoice(channel) {
  return `#${channel.name} (${channel.parent?.name || 'No Category'})`;
}

async function resolveChannelFromInput(guild, member, rawInput) {
  await guild.channels.fetch();

  const input = normalizeChannelInput(rawInput);
  const channels = [...guild.channels.cache.values()]
    .filter((channel) => isAssignableTextChannel(channel, member))
    .sort((left, right) => left.rawPosition - right.rawPosition);

  const byId = channels.find((channel) => channel.id === input);
  if (byId) {
    return { channel: byId };
  }

  const lowered = input.toLowerCase();
  const exactMatches = channels.filter((channel) => channel.name.toLowerCase() === lowered);

  if (exactMatches.length === 1) {
    return { channel: exactMatches[0] };
  }

  if (exactMatches.length > 1) {
    return {
      error: `Multiple channels match \`${rawInput}\`. Please use autocomplete or paste the channel ID instead.\n${exactMatches
        .slice(0, 5)
        .map((channel) => `- ${formatChannelChoice(channel)}`)
        .join('\n')}`
    };
  }

  const partialMatches = channels.filter((channel) => channel.name.toLowerCase().includes(lowered));

  if (partialMatches.length === 1) {
    return { channel: partialMatches[0] };
  }

  if (partialMatches.length > 1) {
    return {
      error: `Multiple channels partially match \`${rawInput}\`. Please refine the name or use autocomplete.\n${partialMatches
        .slice(0, 5)
        .map((channel) => `- ${formatChannelChoice(channel)}`)
        .join('\n')}`
    };
  }

  return {
    error: 'No visible guild text channel matched that input. Use autocomplete, a channel ID, or the exact channel name.'
  };
}

module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('set-channel')
    .setDescription('Assign a Luxénza channel or log destination.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName('target')
        .setDescription('Channel target to configure.')
        .setRequired(true)
        .addChoices(...choices)
    )
    .addStringOption((option) =>
      option
        .setName('channel')
        .setDescription('The Discord channel to assign. Autocomplete, channel ID, or name all work.')
        .setRequired(true)
        .setAutocomplete(true)
    ),
  async autocomplete(interaction) {
    const focusedOption = interaction.options.getFocused(true);
    const query = String(focusedOption.value || '').toLowerCase().trim();

    if (focusedOption.name !== 'channel') {
      await interaction.respond([]);
      return;
    }

    await interaction.guild.channels.fetch();

    const matches = [...interaction.guild.channels.cache.values()]
      .filter((channel) => isAssignableTextChannel(channel, interaction.member))
      .filter((channel) => {
        if (!query) {
          return true;
        }

        return channel.name.toLowerCase().includes(query) || channel.id.includes(query);
      })
      .sort((left, right) => left.rawPosition - right.rawPosition)
      .slice(0, 25)
      .map((channel) => ({
        name: formatChannelChoice(channel),
        value: channel.id
      }));

    await interaction.respond(matches);
  },
  async execute(client, interaction) {
    const target = interaction.options.getString('target', true);
    const channelInput = interaction.options.getString('channel', true);
    const [scope, key] = target.split(':');
    const { channel, error } = await resolveChannelFromInput(interaction.guild, interaction.member, channelInput);

    if (!channel) {
      await interaction.reply({
        embeds: [errorEmbed('Invalid Channel', error)],
        ephemeral: true
      });
      return;
    }

    if (scope === 'transcript') {
      await setTranscriptChannel(interaction.guildId, channel.id);
    } else if (scope === 'channel') {
      await setPathValue(interaction.guildId, 'channelIds', key, channel.id);
    } else {
      await setPathValue(interaction.guildId, 'logChannelIds', key, channel.id);
    }

    await interaction.reply({
      embeds: [successEmbed('Channel Updated', `${channel} is now assigned to \`${target}\`.`)],
      ephemeral: true
    });
  }
};
