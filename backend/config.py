import os
from pathlib import Path
from typing import List
from dotenv import load_dotenv
from pydantic_settings import BaseSettings

# Load environment variables from backend/.env or root .env
_base_dir = Path(__file__).resolve().parent
_root_dir = _base_dir.parent

if (_base_dir / ".env").exists():
    load_dotenv(_base_dir / ".env")
elif (_root_dir / ".env").exists():
    load_dotenv(_root_dir / ".env")
else:
    load_dotenv()


def _discover_gemini_keys() -> List[str]:
    """
    Discovers, strips, and deduplicates all configured Google AI Studio keys in order:
    1. GEMINI_API_KEY_1, GEMINI_API_KEY_2, GEMINI_API_KEY_3, GEMINI_API_KEY_4, ...
    2. Comma-separated GEMINI_API_KEYS=key1,key2,key3,key4
    3. Fallback single GEMINI_API_KEY
    """
    candidates: List[str] = []

    # 1. Individual numbered slots
    idx = 1
    while True:
        val = os.getenv(f"GEMINI_API_KEY_{idx}")
        if val:
            candidates.append(val.strip())
            idx += 1
        else:
            # Also check slots 1..10 in case of gaps
            if idx <= 10:
                idx += 1
                continue
            break

    # 2. Comma-separated list
    csv_keys = os.getenv("GEMINI_API_KEYS", "")
    if csv_keys:
        for piece in csv_keys.split(","):
            piece = piece.strip()
            if piece:
                candidates.append(piece)

    # 3. Legacy single key fallback
    single = os.getenv("GEMINI_API_KEY", "").strip()
    if single:
        candidates.append(single)

    # Deduplicate while preserving order, filtering out empty strings
    seen = set()
    deduped: List[str] = []
    for k in candidates:
        if k and k not in seen:
            seen.add(k)
            deduped.append(k)

    return deduped


class Settings(BaseSettings):
    PROJECT_NAME: str = "ForensicSketch AI"
    API_V1_STR: str = "/api"

    # Database: defaults to local SQLite if DATABASE_URL is not set
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./forensic_local.db")

    # Cloudflare Worker for Free Sketch Generation
    CF_WORKER_URL: str = os.getenv("CF_WORKER_URL", "https://still-limit-6003.amasivarad.workers.dev/")
    CF_WORKER_API_KEY: str = os.getenv("CF_WORKER_API_KEY", "")
    CF_IMAGE_MODEL: str = os.getenv("CF_IMAGE_MODEL", "@cf/black-forest-labs/flux-1-schnell")

    # Multi-Key Gemini Rotation Configuration (Text Reasoning, 14-Region JSON & Translation)
    GEMINI_IMAGE_MODEL: str = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    GEMINI_TEXT_MODEL: str = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.8-flash")
    KEY_COOLDOWN_SECONDS: int = int(os.getenv("KEY_COOLDOWN_SECONDS", "60"))

    # Paths
    BASE_DIR: Path = _base_dir
    DATA_DIR: Path = BASE_DIR / "data"
    SKETCH_DIR: Path = DATA_DIR / "sketches"
    MUGSHOT_DIR: Path = DATA_DIR / "mugshots"

    @property
    def GEMINI_API_KEYS(self) -> List[str]:
        return _discover_gemini_keys()

    @property
    def GEMINI_API_KEY(self) -> str:
        keys = self.GEMINI_API_KEYS
        return keys[0] if keys else ""

    class Config:
        env_file = ".env"
        extra = "allow"


settings = Settings()

# Ensure runtime directories exist
settings.DATA_DIR.mkdir(parents=True, exist_ok=True)
settings.SKETCH_DIR.mkdir(parents=True, exist_ok=True)
settings.MUGSHOT_DIR.mkdir(parents=True, exist_ok=True)
