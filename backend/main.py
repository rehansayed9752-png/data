from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from config import settings
from db.database import init_db
from routers import audit, cases, officers, sketches

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB tables and seed demo officers on startup
    await init_db()
    yield

app = FastAPI(
    title=settings.PROJECT_NAME,
    description="Digital Forensic Composite Sketch Studio with Identity Locking & Cryptographic Audit Chain",
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

@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "database": "connected",
        "ai_primary": "gemini-2.5-flash-image",
        "ai_fallback": "pollinations-flux",
    }
