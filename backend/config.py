import os
from pathlib import Path
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "ForensicSketch AI"
    API_V1_STR: str = "/api"
    
    # Database: defaults to local SQLite if DATABASE_URL is not set
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./forensic_local.db")
    
    # Gemini API Key (optional - will trigger Pollinations Flux fallback if not set)
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    
    # Paths
    BASE_DIR: Path = Path(__file__).resolve().parent
    DATA_DIR: Path = BASE_DIR / "data"
    SKETCH_DIR: Path = DATA_DIR / "sketches"
    MUGSHOT_DIR: Path = DATA_DIR / "mugshots"

    class Config:
        env_file = ".env"
        extra = "allow"

settings = Settings()

# Ensure runtime directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.SKETCH_DIR.mkdir(parents=True, exist_ok=True)
settings.MUGSHOT_DIR.mkdir(parents=True, exist_ok=True)
