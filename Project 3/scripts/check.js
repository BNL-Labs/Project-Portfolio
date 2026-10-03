const path = require("node:path");

const root = path.resolve(__dirname, "..");
const modules = [
  "src/utils/constants.js",
  "src/utils/format.js",
  "src/utils/permissions.js",
  "src/services/configService.js",
  "src/services/storeService.js",
  "src/services/pricingService.js",
  "src/services/paymentService.js",
  "src/services/progressService.js",
  "src/services/embedService.js",
  "src/services/loggingService.js",
  "src/services/ticketService.js",
  "src/services/orderService.js",
  "src/components/index.js",
  "src/handlers/commandHandler.js",
  "src/handlers/eventHandler.js",
  "src/index.js"
];

for (const file of modules) {
  require(path.join(root, file));
}

console.log("Check passed: core modules loaded successfully.");
