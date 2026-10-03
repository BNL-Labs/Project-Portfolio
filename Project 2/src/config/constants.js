const BRAND = {
  name: 'Luxenza',
  botName: 'LX Concierge',
  footer: 'LX Concierge • Crafted for Luxénza',
  palette: {
    gold: 0xd4af37,
    black: 0x0d0d0d,
    success: 0xb99632,
    warning: 0xc38b2b,
    danger: 0x7d1f1f,
    info: 0x2c2c2c
  }
};

const ORDER_STATUSES = [
  'Pending Review',
  'Awaiting Payment',
  'Payment Verified',
  'Confirmed',
  'Processing',
  'Assigned to Agent',
  'Delivered',
  'Closed',
  'Cancelled'
];

const ORDER_STATUS_ACTIONS = {
  claim: 'Assigned to Agent',
  awaiting_payment: 'Awaiting Payment',
  payment_verified: 'Payment Verified',
  confirmed: 'Confirmed',
  processing: 'Processing',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  close: 'Closed'
};

const ORDER_TYPES = [
  { key: 'new', label: 'Place New Order', description: 'Begin a new private order consultation.' },
  { key: 'custom', label: 'Custom Request', description: 'Request a tailored sourcing or styling service.' },
  { key: 'bulk', label: 'Bulk Purchase', description: 'Coordinate a larger premium order.' },
  { key: 'ask', label: 'Ask Before Ordering', description: 'Consult a specialist before purchase.' }
];

const SUPPORT_TYPES = [
  'Payment Issue',
  'Delivery Question',
  'Product Inquiry',
  'Refund Request',
  'VIP Assistance',
  'Other'
];

const SUPPORT_PRIORITIES = ['normal', 'priority', 'VIP priority'];

const ANNOUNCEMENT_TYPES = [
  'New Arrival',
  'Flash Sale',
  'Exclusive Drop',
  'Important Notice',
  'Payment Update',
  'Giveaway Launch'
];

const CHANNEL_KEYS = [
  { key: 'startHere', label: 'start-here' },
  { key: 'aboutBrand', label: 'about-brand' },
  { key: 'roleSelection', label: 'role-selection' },
  { key: 'placeOrder', label: 'place-an-order' },
  { key: 'orderStatus', label: 'order-status' },
  { key: 'orderSupport', label: 'order-support' },
  { key: 'leaveReview', label: 'leave-a-review' },
  { key: 'testimonials', label: 'testimonials' },
  { key: 'staffHub', label: 'staff-hub' },
  { key: 'manageOrders', label: 'manage-orders' },
  { key: 'announcements', label: 'announcements' }
];

const CATEGORY_KEYS = [
  { key: 'orders', label: 'Orders Category' },
  { key: 'support', label: 'Support Category' }
];

const LOG_KEYS = [
  { key: 'order', label: 'Order Logs' },
  { key: 'support', label: 'Support Logs' },
  { key: 'payment', label: 'Payment Logs' },
  { key: 'security', label: 'Security Logs' },
  { key: 'roleUpdate', label: 'Role Update Logs' },
  { key: 'staffAction', label: 'Staff Action Logs' }
];

const ROLE_KEYS = [
  { key: 'ceo', label: 'CEO' },
  { key: 'executiveManager', label: 'Executive Manager' },
  { key: 'orderSpecialist', label: 'Order Specialist' },
  { key: 'supportAgent', label: 'Support Agent' },
  { key: 'vipClient', label: 'VIP Client' },
  { key: 'client', label: 'Client' },
  { key: 'firstBuyer', label: 'First Buyer' },
  { key: 'verifiedMember', label: 'Verified Member' },
  { key: 'paypal', label: 'PayPal' },
  { key: 'cihBank', label: 'CIH Bank' },
  { key: 'attijariBank', label: 'Attijari Bank' },
  { key: 'crypto', label: 'Crypto' },
  { key: 'morocco', label: 'Morocco' },
  { key: 'espana', label: 'Espana' },
  { key: 'france', label: 'France' },
  { key: 'women', label: 'Women' },
  { key: 'men', label: 'Men' }
];

const ROLE_CATEGORY_MAP = {
  payment: ['paypal', 'cihBank', 'attijariBank', 'crypto'],
  location: ['morocco', 'espana', 'france'],
  preference: ['women', 'men']
};

const OWNER_ROLE_KEYS = ['ceo'];
const STAFF_ROLE_KEYS = ['ceo', 'executiveManager', 'orderSpecialist', 'supportAgent'];

module.exports = {
  ANNOUNCEMENT_TYPES,
  BRAND,
  CATEGORY_KEYS,
  CHANNEL_KEYS,
  LOG_KEYS,
  ORDER_STATUSES,
  ORDER_STATUS_ACTIONS,
  ORDER_TYPES,
  OWNER_ROLE_KEYS,
  ROLE_CATEGORY_MAP,
  ROLE_KEYS,
  STAFF_ROLE_KEYS,
  SUPPORT_PRIORITIES,
  SUPPORT_TYPES
};
