require("dotenv").config();

const path = require("node:path");
const { Client, GatewayIntentBits } = require("discord.js");
const ConfigService = require("./services/configService");
const StoreService = require("./services/storeService");
const PricingService = require("./services/pricingService");
const PaymentService = require("./services/paymentService");
const ProgressService = require("./services/progressService");
const EmbedService = require("./services/embedService");
const LoggingService = require("./services/loggingService");
const TicketService = require("./services/ticketService");
const OrderService = require("./services/orderService");
const { loadCommands, deployCommands } = require("./handlers/commandHandler");
const { loadEvents } = require("./handlers/eventHandler");

async function createBotApp() {
  const rootPath = path.resolve(__dirname, "..");
  const configService = new ConfigService(rootPath, process.env);
  const storeService = new StoreService(rootPath, process.env);
  await storeService.init();

  const pricingService = new PricingService(configService);
  const paymentService = new PaymentService(configService, pricingService);
  const progressService = new ProgressService();
  const embedService = new EmbedService(configService, paymentService);

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildMessages
    ]
  });

  const loggingService = new LoggingService(client, configService, embedService);
  const ticketService = new TicketService(configService);
  const orderService = new OrderService(storeService, pricingService, paymentService, progressService);

  client.services = {
    client,
    configService,
    storeService,
    pricingService,
    paymentService,
    progressService,
    embedService,
    loggingService,
    ticketService,
    orderService
  };

  await loadCommands(client, path.join(__dirname, "commands"));
  await loadEvents(client, path.join(__dirname, "events"));

  return {
    client,
    async start() {
      if (!process.env.DISCORD_TOKEN || !process.env.CLIENT_ID) {
        throw new Error("DISCORD_TOKEN and CLIENT_ID are required.");
      }

      await deployCommands(client, process.env);
      await client.login(process.env.DISCORD_TOKEN);
    }
  };
}

if (require.main === module) {
  createBotApp()
    .then((app) => app.start())
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

module.exports = {
  createBotApp
};
