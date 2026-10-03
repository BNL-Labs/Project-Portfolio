from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass
class MemberRiskResult:
    account_age_days: int
    risk_level: str
    summary: str


class MemberAnalysisService:
    def __init__(self, config_service) -> None:
        self.config = config_service

    def analyze(self, member) -> MemberRiskResult:
        now = datetime.now(timezone.utc)
        age_days = max(0, (now - member.created_at).days)
        high_threshold = int(self.config.get("anti_alt", "high_risk_account_age_days", default=3))
        medium_threshold = int(self.config.get("anti_alt", "medium_risk_account_age_days", default=14))

        if age_days <= high_threshold:
            return MemberRiskResult(age_days, "high", f"High risk: account created {age_days} day(s) ago.")
        if age_days <= medium_threshold:
            return MemberRiskResult(age_days, "medium", f"Medium risk: account created {age_days} day(s) ago.")
        return MemberRiskResult(age_days, "low", f"Low risk: account created {age_days} day(s) ago.")
