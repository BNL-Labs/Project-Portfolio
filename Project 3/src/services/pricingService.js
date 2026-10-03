const { roundMoney, normalizeKey } = require("../utils/format");

class PricingService {
  constructor(configService) {
    this.configService = configService;
  }

  getPricingConfig() {
    return this.configService.get().pricing;
  }

  validateLevels(currentLevel, targetLevel) {
    const current = Number(currentLevel);
    const target = Number(targetLevel);

    if (!Number.isInteger(current) || !Number.isInteger(target)) {
      throw new Error("Levels must be whole numbers.");
    }
    if (current < 1 || current > 200 || target < 1 || target > 200) {
      throw new Error("Levels must stay between 1 and 200.");
    }
    if (target <= current) {
      throw new Error("Target level must be higher than current level.");
    }

    return { current, target };
  }

  findPackage(currentLevel, targetLevel) {
    const pricing = this.getPricingConfig();
    return pricing.packages.find(
      (pkg) => pkg.fromLevel === currentLevel && pkg.toLevel === targetLevel
    );
  }

  calculateQuote({ currentLevel, targetLevel, server, rush = false }) {
    const pricing = this.getPricingConfig();
    const { current, target } = this.validateLevels(currentLevel, targetLevel);
    const packageMatch = this.findPackage(current, target);

    const base = packageMatch
      ? {
          source: "package",
          label: packageMatch.title,
          basePriceMad: packageMatch.priceMad,
          etaHours: packageMatch.etaHours
        }
      : this.calculateDynamicQuote(current, target, server);

    const rushFeeMad = rush && pricing.rush.enabled
      ? roundMoney(base.basePriceMad * (pricing.rush.percentage / 100) + pricing.rush.flatFeeMad)
      : 0;

    const etaHoursFinal = rush && pricing.rush.enabled
      ? Math.max(1, roundMoney(base.etaHours * pricing.rush.etaMultiplier))
      : base.etaHours;

    return {
      source: base.source,
      packageLabel: base.label,
      currency: pricing.currency,
      basePriceMad: roundMoney(base.basePriceMad),
      rushFeeMad,
      bankFeeMad: 0,
      totalMad: roundMoney(base.basePriceMad + rushFeeMad),
      etaHoursBase: roundMoney(base.etaHours),
      etaHoursFinal: roundMoney(etaHoursFinal),
      rushSelected: rush
    };
  }

  calculateDynamicQuote(current, target, server) {
    const pricing = this.getPricingConfig();
    const dynamic = pricing.dynamic;
    const serverKey = normalizeKey(server);
    const serverMultiplier = dynamic.serverMultipliers[serverKey] || dynamic.serverMultipliers.default || 1;

    let total = 0;
    for (let level = current + 1; level <= target; level += 1) {
      const band = dynamic.levelBands.find((entry) => level >= entry.min && level <= entry.max) || { multiplier: 1 };
      total += dynamic.basePerLevelMad * band.multiplier;
    }

    total *= serverMultiplier;
    total = Math.max(total, dynamic.minimumPriceMad);

    const etaHours = Math.max((target - current) * dynamic.hoursPerLevel, dynamic.minimumEtaHours);

    return {
      source: "dynamic",
      label: `Custom ${current} -> ${target}`,
      basePriceMad: roundMoney(total),
      etaHours: roundMoney(etaHours)
    };
  }

  applyBankFee(quote, feeMad) {
    const bankFeeMad = roundMoney(feeMad || 0);
    return {
      ...quote,
      bankFeeMad,
      totalMad: roundMoney(quote.basePriceMad + quote.rushFeeMad + bankFeeMad)
    };
  }
}

module.exports = PricingService;
