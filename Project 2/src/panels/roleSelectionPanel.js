const { ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const { createPanelEmbed } = require('../utils/embedFactory');

function buildRoleSelectionPanel(settings = {}) {
  const flags = settings.featureFlags || {};
  const paymentSelect = new StringSelectMenuBuilder()
    .setCustomId('roles:payment')
    .setPlaceholder('Select your preferred payment method')
    .setMaxValues(flags.allowMultiRolePayment ? 4 : 1)
    .addOptions(
      { label: 'PayPal', value: 'paypal' },
      { label: 'CIH Bank', value: 'cihBank' },
      { label: 'Attijari Bank', value: 'attijariBank' },
      { label: 'Crypto', value: 'crypto' },
      { label: 'Clear Selection', value: 'clear' }
    );

  const locationSelect = new StringSelectMenuBuilder()
    .setCustomId('roles:location')
    .setPlaceholder('Select your location')
    .setMaxValues(flags.allowMultiRoleLocation ? 3 : 1)
    .addOptions(
      { label: 'Morocco', value: 'morocco' },
      { label: 'Espana', value: 'espana' },
      { label: 'France', value: 'france' },
      { label: 'Clear Selection', value: 'clear' }
    );

  const preferenceSelect = new StringSelectMenuBuilder()
    .setCustomId('roles:preference')
    .setPlaceholder('Select your shopping preference')
    .setMaxValues(flags.allowMultiRolePreference ? 2 : 1)
    .addOptions(
      { label: 'Women', value: 'women' },
      { label: 'Men', value: 'men' },
      { label: 'Clear Selection', value: 'clear' }
    );

  return {
    embeds: [
      createPanelEmbed({
        title: 'Client Preference Suite',
        description: 'Refine your shopping profile so our concierge team can tailor the experience around you.',
        eyebrow: 'Selections can be updated at any time.',
        lines: ['Payment method', 'Location preference', 'Collection preference']
      })
    ],
    components: [
      new ActionRowBuilder().addComponents(paymentSelect),
      new ActionRowBuilder().addComponents(locationSelect),
      new ActionRowBuilder().addComponents(preferenceSelect)
    ]
  };
}

module.exports = { buildRoleSelectionPanel };
