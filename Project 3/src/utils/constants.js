const ORDER_STATUS = {
  WAITING_PAYMENT: "Waiting Payment",
  WAITING_VERIFICATION: "Waiting Verification",
  PAID: "Paid",
  IN_PROGRESS: "In Progress",
  PAUSED: "Paused",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled"
};

const PAYMENT_METHOD = {
  CIH_TO_CIH: "CIH_TO_CIH",
  OTHER_BANK_TO_CIH: "OTHER_BANK_TO_CIH",
  KAMAS: "KAMAS"
};

const PAYMENT_STATE = {
  UNPAID: "Unpaid",
  WAITING_VERIFICATION: "Waiting Verification",
  PAID: "Paid",
  REJECTED: "Rejected",
  NEEDS_NEW_PROOF: "Needs New Proof"
};

const TICKET_TYPE = {
  ORDER: "ORDER",
  QUESTION: "QUESTION",
  ISSUE: "ISSUE"
};

const DEFAULT_STORE = {
  meta: {
    nextOrderNumber: 1,
    nextDraftNumber: 1
  },
  drafts: {},
  orders: {},
  reviews: {}
};

module.exports = {
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATE,
  TICKET_TYPE,
  DEFAULT_STORE
};
