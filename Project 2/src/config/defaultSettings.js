function createDefaultSettings(guildId = null) {
  return {
    guildId,
    channelIds: {
      startHere: null,
      aboutBrand: null,
      roleSelection: null,
      placeOrder: null,
      orderStatus: null,
      orderSupport: null,
      leaveReview: null,
      testimonials: null,
      staffHub: null,
      manageOrders: null,
      announcements: null
    },
    categoryIds: {
      orders: null,
      support: null
    },
    roleIds: {
      ceo: null,
      executiveManager: null,
      orderSpecialist: null,
      supportAgent: null,
      vipClient: null,
      client: null,
      firstBuyer: null,
      verifiedMember: null,
      paypal: null,
      cihBank: null,
      attijariBank: null,
      crypto: null,
      morocco: null,
      espana: null,
      france: null,
      women: null,
      men: null
    },
    logChannelIds: {
      order: null,
      support: null,
      payment: null,
      security: null,
      roleUpdate: null,
      staffAction: null
    },
    transcriptChannelId: null,
    panelMessages: {
      verification: null,
      roleSelection: null,
      order: null,
      support: null,
      review: null,
      orderStatus: null,
      staff: null
    },
    sequences: {
      order: 1000,
      support: 200
    },
    featureFlags: {
      ordersLocked: false,
      panicMode: false,
      preventDuplicateActiveOrders: true,
      dmOnVerify: true,
      singleRolePerCategory: true,
      allowMultiRolePayment: false,
      allowMultiRoleLocation: false,
      allowMultiRolePreference: false
    }
  };
}

module.exports = { createDefaultSettings };
