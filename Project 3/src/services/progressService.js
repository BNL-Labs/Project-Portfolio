const { progressBar } = require("../utils/format");

class ProgressService {
  calculate({ startLevel, currentLevel, targetLevel }) {
    const start = Number(startLevel);
    const current = Number(currentLevel);
    const target = Number(targetLevel);
    const denominator = Math.max(1, target - start);
    const percentage = Math.max(0, Math.min(100, Math.round(((current - start) / denominator) * 100)));

    return {
      startLevel: start,
      currentLevel: current,
      targetLevel: target,
      percentage,
      bar: progressBar(percentage)
    };
  }
}

module.exports = ProgressService;
