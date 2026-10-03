const { SlashCommandBuilder, ChannelType } = require("discord.js");
const { isStaff } = require("../../utils/permissions");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("panel")
    .setDescription("Send the public PL panel or the staff command center.")
    .addStringOption((option) =>
      option
        .setName("mode")
        .setDescription("Choose which panel to send.")
        .addChoices(
          { name: "Public customer panel", value: "public" },
          { name: "Staff command center", value: "staff" }
        )
        .setRequired(false)
    )
    .addChannelOption((option) =>
      option
        .setName("channel")
        .setDescription("Channel where the panel should be posted.")
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(false)
    ),
  async execute(interaction, services) {
    const settings = services.configService.get();
    if (!isStaff(interaction.member, settings)) {
      return interaction.reply({ content: "This command is for staff only.", ephemeral: true });
    }

    const mode = interaction.options.getString("mode") || "public";
    const channel = interaction.options.getChannel("channel") || interaction.channel;
    const panel = mode === "staff"
      ? services.embedService.buildStaffPanel()
      : services.embedService.buildPanel();

    await channel.send({ embeds: [panel.embed], components: panel.components });
    return interaction.reply({
      content: `${mode === "staff" ? "Staff command center" : "PL panel"} sent in ${channel}.`,
      ephemeral: true
    });
  }
};
