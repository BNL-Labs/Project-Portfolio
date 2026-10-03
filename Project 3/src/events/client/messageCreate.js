const { ORDER_STATUS, PAYMENT_STATE } = require("../../utils/constants");
const { refreshOrderTicket } = require("../../components");

module.exports = {
  name: "messageCreate",
  async execute(client, message) {
    if (!message.guild || message.author.bot) {
      return;
    }

    const services = client.services;
    const order = services.orderService.findByChannelId(message.channelId);
    if (!order) {
      return;
    }
    if (message.author.id !== order.customerId) {
      return;
    }
    if ([ORDER_STATUS.COMPLETED, ORDER_STATUS.CANCELLED].includes(order.status)) {
      return;
    }
    if (order.payment.state === PAYMENT_STATE.PAID) {
      return;
    }

    const imageAttachments = [...message.attachments.values()].filter((attachment) =>
      attachment.contentType?.startsWith("image/")
    );
    if (imageAttachments.length === 0) {
      return;
    }

    await services.orderService.setPaymentProof(order.id, message.author.id, {
      messageId: message.id,
      uploadedAt: new Date().toISOString(),
      attachments: imageAttachments.map((attachment) => ({
        url: attachment.url,
        name: attachment.name
      }))
    });

    await refreshOrderTicket(order.id, services);
    await message.channel.send({
      embeds: [services.embedService.buildProofReceived(services.orderService.getOrder(order.id))]
    });
    await services.loggingService.log(message.guild, {
      title: "Proof Uploaded",
      description: `Payment proof uploaded for ${order.id}.`
    });
  }
};
