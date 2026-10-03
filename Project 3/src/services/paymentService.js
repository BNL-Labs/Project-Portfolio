const { PAYMENT_METHOD } = require("../utils/constants");
const { roundMoney } = require("../utils/format");

class PaymentService {
  constructor(configService, pricingService) {
    this.configService = configService;
    this.pricingService = pricingService;
  }

  getProfiles() {
    const settings = this.configService.get();
    const options = [];
    const profiles = settings.payment.feeTable.profiles;

    if (settings.payment.cihToCih.enabled && profiles.cih_internal) {
      options.push({
        key: "cih_internal",
        label: profiles.cih_internal.label,
        description: "Internal CIH transfer using the short CIH account number.",
        method: PAYMENT_METHOD.CIH_TO_CIH,
        feeMad: profiles.cih_internal.feeMad
      });
    }

    for (const [key, profile] of Object.entries(profiles)) {
      if (key === "cih_internal") {
        continue;
      }
      if (profile.method === PAYMENT_METHOD.OTHER_BANK_TO_CIH && settings.payment.otherBankToCih.enabled) {
        options.push({
          key,
          label: profile.label,
          description: "Interbank transfer to CIH using the full RIB format.",
          method: PAYMENT_METHOD.OTHER_BANK_TO_CIH,
          feeMad: profile.feeMad
        });
      }
    }

    if (settings.payment.kamas.enabled) {
      options.push({
        key: "kamas",
        label: "Kamas payment",
        description: "Optional manual kamas payment flow.",
        method: PAYMENT_METHOD.KAMAS,
        feeMad: 0
      });
    }

    return options;
  }

  getProfile(profileKey) {
    const settings = this.configService.get();
    if (profileKey === "kamas" && settings.payment.kamas.enabled) {
      return {
        key: "kamas",
        label: "Kamas payment",
        method: PAYMENT_METHOD.KAMAS,
        feeMad: 0,
        note: settings.payment.kamas.instructions
      };
    }

    const profile = settings.payment.feeTable.profiles[profileKey];
    if (!profile) {
      return null;
    }

    return {
      key: profileKey,
      ...profile
    };
  }

  applySelection(quote, profileKey, manualFeeOverrideMad = null) {
    const settings = this.configService.get();
    const profile = this.getProfile(profileKey);
    if (!profile) {
      throw new Error("Unknown payment profile.");
    }

    // Moroccan transfer fees can change by bank, transfer channel, package, or promo rules.
    // Keep the defaults in config editable and allow a per-order manual override when staff need it.
    const feeMad = manualFeeOverrideMad !== null && settings.payment.supportManualFeeOverride
      ? roundMoney(manualFeeOverrideMad)
      : roundMoney(profile.feeMad || 0);

    return {
      profile,
      quote: this.pricingService.applyBankFee(quote, feeMad)
    };
  }

  getPaymentInstructions(order) {
    const settings = this.configService.get();
    if (order.payment.method === PAYMENT_METHOD.CIH_TO_CIH) {
      return {
        title: "CIH -> CIH Transfer",
        lines: [
          "This is the internal CIH transfer option.",
          `Account holder: ${settings.payment.cihToCih.accountHolderName}`,
          `Short CIH account number: ${settings.payment.cihToCih.shortAccountNumber}`,
          `Contact: ${settings.payment.cihToCih.contact}`,
          settings.payment.cihToCih.note,
          "Proof of payment is required after transfer."
        ]
      };
    }

    if (order.payment.method === PAYMENT_METHOD.OTHER_BANK_TO_CIH) {
      return {
        title: "OTHER BANK -> CIH Transfer",
        lines: [
          "Use this option when sending from another Moroccan bank to CIH.",
          `Account holder: ${settings.payment.otherBankToCih.accountHolderName}`,
          `Bank name: ${settings.payment.otherBankToCih.bankName}`,
          `Full RIB: ${settings.payment.otherBankToCih.fullRib}`,
          `Contact: ${settings.payment.otherBankToCih.contact}`,
          settings.payment.otherBankToCih.note,
          "Any sender-bank transfer fee must be included in the billed total."
        ]
      };
    }

    return {
      title: "Kamas payment",
      lines: [
        "Kamas payment is optional and manually validated.",
        settings.payment.kamas.instructions,
        `Reference rate: ${settings.payment.kamas.referenceRate}`
      ]
    };
  }
}

module.exports = PaymentService;
