from __future__ import annotations

from ..config import Settings
from .providers.base import BillingProviderAdapter
from .providers.paddle import PaddleBillingProvider
from .providers.stripe import StripeBillingProvider


class NullBillingProvider(BillingProviderAdapter):
    name = "none"

    def provider_status(self):
        return {
            "provider": self.name,
            "configured": False,
            "ready": False,
            "missing": ["BILLING_PROVIDER"],
            "details": {},
        }


def resolve_billing_provider(settings: Settings) -> BillingProviderAdapter:
    provider = (settings.billing_provider or "").strip().lower()
    if provider == "stripe":
        return StripeBillingProvider(settings)
    if provider == "paddle":
        return PaddleBillingProvider(settings)
    return NullBillingProvider()
