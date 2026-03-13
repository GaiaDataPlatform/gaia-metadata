from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://gaia:gaiapass@localhost:5432/gaia_metadata"
    secret_key: str = "changeme"
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 480

    nmea_host: str = "127.0.0.1"
    nmea_port: int = 10115
    gaia_acquisition_url: str = "http://localhost:8080"
    vessel_name: str = "Gaia Blu"

    class Config:
        env_file = ".env"

settings = Settings()
