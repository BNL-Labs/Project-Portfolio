const { ORDER_STATUS, PAYMENT_STATE } = require("../utils/constants");

class OrderService {
  constructor(storeService, pricingService, paymentService, progressService) {
    this.storeService = storeService;
    this.pricingService = pricingService;
    this.paymentService = paymentService;
    this.progressService = progressService;
  }

  getDraft(draftId) {
    return this.storeService.read().drafts[draftId] || null;
  }

  getOrder(orderId) {
    return this.storeService.read().orders[orderId] || null;
  }

  getAllOrders() {
    return Object.values(this.storeService.read().orders);
  }

  findByChannelId(channelId) {
    return this.getAllOrders().find((order) => order.channelId === channelId) || null;
  }

  async createDraft({ guildId, userId }) {
    return this.storeService.update((state) => {
      const draftNumber = String(state.meta.nextDraftNumber).padStart(4, "0");
      state.meta.nextDraftNumber += 1;
      const draftId = `DRAFT-${draftNumber}`;
      const now = new Date().toISOString();

      state.drafts[draftId] = {
        id: draftId,
        guildId,
        userId,
        speed: "normal",
        paymentProfileKey: null,
        paymentProfileLabel: null,
        quote: null,
        createdAt: now,
        updatedAt: now
      };

      return state.drafts[draftId];
    });
  }

  async deleteDraft(draftId) {
    return this.storeService.update((state) => {
      delete state.drafts[draftId];
      return true;
    });
  }

  async updateDraftFields(draftId, updates) {
    return this.storeService.update((state) => {
      const draft = state.drafts[draftId];
      if (!draft) {
        throw new Error("Draft not found.");
      }

      Object.assign(draft, updates, { updatedAt: new Date().toISOString() });
      this.rebuildDraft(draft);
      return draft;
    });
  }

  rebuildDraft(draft) {
    if (!draft.currentLevel || !draft.targetLevel || !draft.server) {
      return draft;
    }

    const quote = this.pricingService.calculateQuote({
      currentLevel: draft.currentLevel,
      targetLevel: draft.targetLevel,
      server: draft.server,
      rush: draft.speed === "rush"
    });

    if (draft.paymentProfileKey) {
      const selection = this.paymentService.applySelection(quote, draft.paymentProfileKey, draft.manualBankFeeMad ?? null);
      draft.paymentMethod = selection.profile.method;
      draft.paymentProfileLabel = selection.profile.label;
      draft.quote = selection.quote;
      return draft;
    }

    draft.quote = quote;
    return draft;
  }

  async confirmDraft(draftId) {
    return this.storeService.update((state) => {
      const draft = state.drafts[draftId];
      if (!draft) {
        throw new Error("Draft not found.");
      }
      if (!draft.quote || !draft.paymentProfileKey) {
        throw new Error("Draft is incomplete.");
      }

      const orderNumber = String(state.meta.nextOrderNumber).padStart(4, "0");
      state.meta.nextOrderNumber += 1;
      const orderId = `PL-${orderNumber}`;
      const now = new Date().toISOString();
      const progress = this.progressService.calculate({
        startLevel: draft.currentLevel,
        currentLevel: draft.currentLevel,
        targetLevel: draft.targetLevel
      });

      state.orders[orderId] = {
        id: orderId,
        guildId: draft.guildId,
        customerId: draft.userId,
        channelId: null,
        ticketMessageId: null,
        completionMessageId: null,
        claimedBy: null,
        server: draft.server,
        currentLevel: Number(draft.currentLevel),
        targetLevel: Number(draft.targetLevel),
        notes: draft.notes || "",
        status: ORDER_STATUS.WAITING_PAYMENT,
        quote: draft.quote,
        payment: {
          profileKey: draft.paymentProfileKey,
          profileLabel: draft.paymentProfileLabel,
          method: draft.paymentMethod,
          state: PAYMENT_STATE.UNPAID,
          manualBankFeeMad: draft.manualBankFeeMad ?? null,
          proofHistory: [],
          lastProof: null,
          lastRejectionReason: null,
          verifiedBy: null,
          verifiedAt: null
        },
        progress: {
          ...progress,
          milestones: []
        },
        staffNotes: [],
        review: null,
        timestamps: {
          createdAt: now,
          updatedAt: now,
          completedAt: null,
          confirmedAt: null,
          cancelledAt: null
        },
        timeline: [
          {
            type: "ORDER_CREATED",
            at: now,
            message: "Order created."
          }
        ]
      };

      delete state.drafts[draftId];
      return state.orders[orderId];
    });
  }

  async setChannel(orderId, channelId) {
    return this.updateOrder(orderId, (order) => {
      order.channelId = channelId;
    });
  }

  async setTicketMessage(orderId, ticketMessageId) {
    return this.updateOrder(orderId, (order) => {
      order.ticketMessageId = ticketMessageId;
    });
  }

  async setCompletionMessage(orderId, completionMessageId) {
    return this.updateOrder(orderId, (order) => {
      order.completionMessageId = completionMessageId;
    });
  }

  async claimOrder(orderId, userId) {
    return this.updateOrder(orderId, (order) => {
      order.claimedBy = userId;
      this.touch(order, "ORDER_CLAIMED", `Order claimed by ${userId}.`);
    });
  }

  async setStatus(orderId, status, actorId, reason = "") {
    return this.updateOrder(orderId, (order) => {
      order.status = status;
      if (status === ORDER_STATUS.COMPLETED) {
        order.timestamps.completedAt = new Date().toISOString();
      }
      if (status === ORDER_STATUS.CANCELLED) {
        order.timestamps.cancelledAt = new Date().toISOString();
      }
      this.touch(
        order,
        "STATUS_CHANGED",
        `Status changed to ${status}.${reason ? ` Reason: ${reason}` : ""}`,
        actorId
      );
    });
  }

  async addStaffNote(orderId, actorId, note) {
    return this.updateOrder(orderId, (order) => {
      order.staffNotes.push({
        note,
        actorId,
        at: new Date().toISOString()
      });
      this.touch(order, "STAFF_NOTE_ADDED", "Private staff note added.", actorId);
    });
  }

  async setPaymentProof(orderId, actorId, proof) {
    return this.updateOrder(orderId, (order) => {
      order.payment.lastProof = proof;
      order.payment.proofHistory.push(proof);
      order.payment.state = PAYMENT_STATE.WAITING_VERIFICATION;
      order.status = ORDER_STATUS.WAITING_VERIFICATION;
      this.touch(order, "PROOF_UPLOADED", "Payment proof uploaded.", actorId);
    });
  }

  async verifyPayment(orderId, actorId, note = "") {
    return this.updateOrder(orderId, (order) => {
      order.payment.state = PAYMENT_STATE.PAID;
      order.payment.verifiedBy = actorId;
      order.payment.verifiedAt = new Date().toISOString();
      order.status = ORDER_STATUS.PAID;
      order.payment.lastRejectionReason = null;
      this.touch(order, "PAYMENT_VERIFIED", `Payment verified.${note ? ` ${note}` : ""}`, actorId);
    });
  }

  async rejectPayment(orderId, actorId, reason, askNewProof = false) {
    return this.updateOrder(orderId, (order) => {
      order.payment.state = askNewProof ? PAYMENT_STATE.NEEDS_NEW_PROOF : PAYMENT_STATE.REJECTED;
      order.payment.lastRejectionReason = reason;
      order.status = ORDER_STATUS.WAITING_PAYMENT;
      this.touch(
        order,
        askNewProof ? "NEW_PROOF_REQUESTED" : "PAYMENT_REJECTED",
        reason,
        actorId
      );
    });
  }

  async adjustBilling(orderId, actorId, manualBankFeeMad) {
    return this.updateOrder(orderId, (order) => {
      order.payment.manualBankFeeMad = Number(manualBankFeeMad);
      const baseQuote = this.pricingService.calculateQuote({
        currentLevel: order.currentLevel,
        targetLevel: order.targetLevel,
        server: order.server,
        rush: order.quote.rushSelected
      });
      const selection = this.paymentService.applySelection(
        baseQuote,
        order.payment.profileKey,
        Number(manualBankFeeMad)
      );
      order.quote = selection.quote;
      this.touch(order, "BILLING_ADJUSTED", `Manual bank fee override set to ${manualBankFeeMad}.`, actorId);
    });
  }

  async updateProgress(orderId, actorId, currentLevel, note = "") {
    return this.updateOrder(orderId, (order) => {
      if (Number(currentLevel) < order.progress.startLevel || Number(currentLevel) > order.targetLevel) {
        throw new Error("Current level must stay within the order range.");
      }

      const progress = this.progressService.calculate({
        startLevel: order.progress.startLevel ?? order.currentLevel,
        currentLevel,
        targetLevel: order.targetLevel
      });
      order.progress = {
        ...progress,
        milestones: [
          ...(order.progress.milestones || []),
          {
            currentLevel: Number(currentLevel),
            percentage: progress.percentage,
            note,
            actorId,
            at: new Date().toISOString()
          }
        ]
      };
      if (order.status === ORDER_STATUS.PAID) {
        order.status = ORDER_STATUS.IN_PROGRESS;
      }
      this.touch(order, "PROGRESS_UPDATED", `Progress updated to level ${currentLevel}.${note ? ` ${note}` : ""}`, actorId);
    });
  }

  async confirmCompletion(orderId, actorId) {
    return this.updateOrder(orderId, (order) => {
      order.timestamps.confirmedAt = new Date().toISOString();
      this.touch(order, "COMPLETION_CONFIRMED", "Customer confirmed completion.", actorId);
    });
  }

  async saveReview(orderId, customerId, stars, text) {
    return this.storeService.update((state) => {
      const order = state.orders[orderId];
      if (!order) {
        throw new Error("Order not found.");
      }

      const review = {
        orderId,
        customerId,
        stars,
        text,
        at: new Date().toISOString()
      };

      order.review = review;
      order.timestamps.updatedAt = new Date().toISOString();
      order.timeline.push({
        type: "REVIEW_SAVED",
        at: review.at,
        actorId: customerId,
        message: `Review saved with ${stars} stars.`
      });
      state.reviews[orderId] = review;
      return review;
    });
  }

  async updateOrder(orderId, mutator) {
    return this.storeService.update((state) => {
      const order = state.orders[orderId];
      if (!order) {
        throw new Error("Order not found.");
      }

      mutator(order);
      order.timestamps.updatedAt = new Date().toISOString();
      return order;
    });
  }

  touch(order, type, message, actorId = null) {
    order.timeline.push({
      type,
      at: new Date().toISOString(),
      actorId,
      message
    });
  }
}

module.exports = OrderService;
