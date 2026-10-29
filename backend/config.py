import os
from pathlib import Path
from typing import List, Tuple
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


def _discover_cf_keys() -> List[str]:
    raw_keys = [
        os.getenv("CF_WORKER_API_KEY", ""),
        os.getenv("CF_WORKER_API_KEY_1", ""),
        os.getenv("CF_WORKER_API_KEY_2", ""),
        os.getenv("API-KEY", ""),
        os.getenv("API_KEY", ""),
        "forensic_secret_2026",
        "12345",
    ]
    deduped: List[str] = []
    for k in raw_keys:
        k = k.strip()
        if k and k not in deduped:
            deduped.append(k)
    return deduped


def _discover_cf_endpoints() -> List[Tuple[str, str]]:
    """
    Returns configured Cloudflare Worker (URL, API_KEY) pairs in failover priority order.
    Pair 1: Primary Worker (CF_WORKER_URL_1, CF_WORKER_API_KEY_1) -> forensic_secret_2026
    Pair 2: Secondary Worker (CF_WORKER_URL_2, CF_WORKER_API_KEY_2) -> 12345
    """
    endpoints: List[Tuple[str, str]] = []

    # Primary Worker 1
    url_1 = (os.getenv("CF_WORKER_URL_1") or os.getenv("CF_WORKER_URL") or "https://still-limit-6003.amasivarad.workers.dev/").strip()
    key_1 = (os.getenv("CF_WORKER_API_KEY_1") or os.getenv("CF_WORKER_API_KEY") or "forensic_secret_2026").strip()
    if url_1 and key_1:
        endpoints.append((url_1, key_1))

    # Secondary Worker 2
    url_2 = (os.getenv("CF_WORKER_URL_2") or "https://orange-unit-7056.rehansayed9752.workers.dev/").strip()
    key_2 = (os.getenv("CF_WORKER_API_KEY_2") or os.getenv("API-KEY") or os.getenv("API_KEY") or "12345").strip()
    if url_2 and key_2 and (url_2, key_2) not in endpoints:
        endpoints.append((url_2, key_2))

    return endpoints


class Settings(BaseSettings):
    PROJECT_NAME: str = "ForensicSketch AI"
    API_V1_STR: str = "/api"

    # Database: defaults to local SQLite if DATABASE_URL is not set
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./forensic_local.db")

    # Cloudflare Worker for Free Sketch Generation (Dual-Worker Cluster)
    CF_WORKER_URL: str = os.getenv("CF_WORKER_URL", "https://still-limit-6003.amasivarad.workers.dev/")
    CF_WORKER_API_KEY: str = os.getenv("CF_WORKER_API_KEY", "forensic_secret_2026")
    CF_WORKER_URL_1: str = os.getenv("CF_WORKER_URL_1", "https://still-limit-6003.amasivarad.workers.dev/")
    CF_WORKER_API_KEY_1: str = os.getenv("CF_WORKER_API_KEY_1", "forensic_secret_2026")
    CF_WORKER_URL_2: str = os.getenv("CF_WORKER_URL_2", "https://orange-unit-7056.rehansayed9752.workers.dev/")
    CF_WORKER_API_KEY_2: str = os.getenv("CF_WORKER_API_KEY_2", "12345")
    CF_IMAGE_MODEL: str = os.getenv("CF_IMAGE_MODEL", "@cf/black-forest-labs/flux-1-schnell")

    # Multi-Key Gemini Rotation Configuration (Text Reasoning, 14-Region JSON & Translation)
    GEMINI_IMAGE_MODEL: str = os.getenv("GEMINI_IMAGE_MODEL", "gemini-2.5-flash-image")
    GEMINI_TEXT_MODEL: str = os.getenv("GEMINI_TEXT_MODEL", "gemini-2.5-flash")
    KEY_COOLDOWN_SECONDS: int = int(os.getenv("KEY_COOLDOWN_SECONDS", "60"))

    # Paths
    BASE_DIR: Path = _base_dir
    DATA_DIR: Path = BASE_DIR / "data"
    SKETCH_DIR: Path = DATA_DIR / "sketches"
    MUGSHOT_DIR: Path = DATA_DIR / "mugshots"

    @property
    def CF_WORKER_ENDPOINTS(self) -> List[Tuple[str, str]]:
        return _discover_cf_endpoints()

    @property
    def CF_WORKER_API_KEYS(self) -> List[str]:
        keys = []
        for _, k in self.CF_WORKER_ENDPOINTS:
            if k not in keys:
                keys.append(k)
        for k in _discover_cf_keys():
            if k not in keys:
                keys.append(k)
        return keys

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
