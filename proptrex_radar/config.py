from dataclasses import dataclass
from pathlib import Path
import os


ROOT_DIR = Path(__file__).resolve().parents[1]
PUBLIC_DIR = ROOT_DIR / "public"
APP_DIR = ROOT_DIR / "proptrex_radar"
DATA_DIR = ROOT_DIR / "data"
DATA_DIR.mkdir(parents=True, exist_ok=True)


@dataclass(frozen=True)
class Settings:
    host: str = "0.0.0.0"
    port: int = 8000
    telegram_bot_token: str = ""
    telegram_bot_username: str = ""
    telegram_webhook_secret: str = ""
    public_base_url: str = ""
    billing_provider: str = ""
    billing_webhook_secret: str = ""
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_ids_json: str = ""
    stripe_customer_portal_url: str = ""
    paddle_api_key: str = ""
    paddle_webhook_secret: str = ""
    paddle_price_ids_json: str = ""
    checkout_success_url: str = ""
    checkout_cancel_url: str = ""
    billing_portal_url: str = ""
    admin_security_token: str = ""


def load_settings() -> Settings:
    return Settings(
        host=os.getenv("HOST", "0.0.0.0"),
        port=int(os.getenv("PORT", "8000")),
        telegram_bot_token=os.getenv("TELEGRAM_BOT_TOKEN", "").strip(),
        telegram_bot_username=os.getenv("TELEGRAM_BOT_USERNAME", "").strip().lstrip("@"),
        telegram_webhook_secret=os.getenv("TELEGRAM_WEBHOOK_SECRET", "").strip(),
        public_base_url=os.getenv("PUBLIC_BASE_URL", "").strip().rstrip("/"),
        billing_provider=os.getenv("BILLING_PROVIDER", "").strip(),
        billing_webhook_secret=os.getenv("BILLING_WEBHOOK_SECRET", "").strip(),
        stripe_secret_key=os.getenv("STRIPE_SECRET_KEY", "").strip(),
        stripe_webhook_secret=os.getenv("STRIPE_WEBHOOK_SECRET", "").strip(),
        stripe_price_ids_json=os.getenv("STRIPE_PRICE_IDS_JSON", "").strip(),
        stripe_customer_portal_url=os.getenv("STRIPE_CUSTOMER_PORTAL_URL", "").strip(),
        paddle_api_key=os.getenv("PADDLE_API_KEY", "").strip(),
        paddle_webhook_secret=os.getenv("PADDLE_WEBHOOK_SECRET", "").strip(),
        paddle_price_ids_json=os.getenv("PADDLE_PRICE_IDS_JSON", "").strip(),
        checkout_success_url=os.getenv("CHECKOUT_SUCCESS_URL", "").strip(),
        checkout_cancel_url=os.getenv("CHECKOUT_CANCEL_URL", "").strip(),
        billing_portal_url=os.getenv("BILLING_PORTAL_URL", "").strip(),
        admin_security_token=os.getenv("ADMIN_SECURITY_TOKEN", "").strip(),
    )
