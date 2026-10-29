import sys
from pathlib import Path

# Ensure backend directory is in sys.path for direct imports
backend_dir = Path(__file__).resolve().parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from db.database import init_db
from routers import audit, cases, officers, sketches, system
from services.gemini_key_pool import key_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed demo officers on startup
    await init_db()
    yield


app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Digital Forensic Composite Sketch Studio with Multi-Key Gemini Rotation, Identity Locking & Cryptographic Audit Chain",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files for generated sketches and mugshots
app.mount("/static/sketches", StaticFiles(directory=str(settings.SKETCH_DIR)), name="sketches")
app.mount("/static/mugshots", StaticFiles(directory=str(settings.MUGSHOT_DIR)), name="mugshots")

# Include Routers
app.include_router(officers.router, prefix=settings.API_V1_STR)
app.include_router(cases.router, prefix=settings.API_V1_STR)
app.include_router(sketches.router, prefix=settings.API_V1_STR)
app.include_router(audit.router, prefix=settings.API_V1_STR)
app.include_router(system.router, prefix=settings.API_V1_STR)


@app.get("/health")
async def health_check():
    pool_status = key_pool.get_pool_status()
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected",
        "gemini_cluster": {
            "status": pool_status["cluster_status"],
            "total_keys": pool_status["total_keys"],
            "active_healthy_keys": pool_status["active_healthy_keys"],
        },
        "cloudflare_worker": {
            "status": "configured" if settings.CF_WORKER_ENDPOINTS else "unconfigured",
            "url": settings.CF_WORKER_URL,
            "total_workers": len(settings.CF_WORKER_ENDPOINTS),
            "endpoints": [url for url, _ in settings.CF_WORKER_ENDPOINTS],
            "model": settings.CF_IMAGE_MODEL,
        },
        "ai_primary": "cloudflare-flux-schnell",
        "ai_text": settings.GEMINI_TEXT_MODEL,
        "ai_fallback": "pollinations-flux",
    }
