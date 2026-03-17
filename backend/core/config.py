from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    anthropic_api_key: str = ""
    openai_api_key: str = ""
    google_api_key: str = ""
    sporttsdataio_api_key: str = ""  # matches .env key SPORTTSDATAIO_API_KEY
    brave_search_api_key: str = ""
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:3000"]
    initial_credits: int = 500

    # Supabase
    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_service_role_key: str = ""
    supabase_jwt_secret: str = ""  # Settings > API > JWT Secret in Supabase dashboard

    # Stripe
    stripe_secret_key: str = ""
    stripe_webhook_secret: str = ""
    stripe_price_id: str = ""       # Price ID for credit pack (e.g. price_xxx)
    stripe_credits_per_pack: int = 5000  # How many credits per purchased pack ($7 = 5000 credits)

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8", "extra": "ignore"}


@lru_cache
def get_settings() -> Settings:
    return Settings()
