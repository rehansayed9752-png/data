from datetime import datetime, timezone
import uuid
import os
import logging
import urllib.parse
from typing import Any, Dict, List, Optional
from sqlalchemy import (
    BigInteger,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    JSON,
    TypeDecorator,
    Dialect,
    select,
)
from sqlalchemy.dialects.postgresql import UUID as PG_UUID, JSONB, ARRAY
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, relationship

from config import settings

logger = logging.getLogger("forensic_database")

# ==========================================
# 1. Platform-Agnostic Types (PostgreSQL / Supabase + SQLite)
# ==========================================

class UniversalUUID(TypeDecorator):
    """
    Platform-independent UUID type.
    Uses PostgreSQL UUID when connecting to PostgreSQL / Supabase,
    and String(36) when connecting to SQLite.
    Binds and returns Python string representations seamlessly.
    """
    impl = String(36)
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(PG_UUID(as_uuid=False))
        return dialect.type_descriptor(String(36))

    def process_bind_param(self, value, dialect):
        return str(value) if value is not None else None

    def process_result_value(self, value, dialect):
        return str(value) if value is not None else None


class UniversalJSON(TypeDecorator):
    """
    Platform-independent JSON type.
    Uses PostgreSQL JSONB for indexing and efficiency on Supabase,
    and standard JSON on SQLite.
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(JSONB)
        return dialect.type_descriptor(JSON)


class UniversalList(TypeDecorator):
    """
    Platform-independent list type.
    Uses PostgreSQL TEXT[] (ARRAY) on Supabase, and JSON on SQLite.
    """
    impl = JSON
    cache_ok = True

    def load_dialect_impl(self, dialect: Dialect):
        if dialect.name == "postgresql":
            return dialect.type_descriptor(ARRAY(String))
        return dialect.type_descriptor(JSON)


# ==========================================
# 2. Resilient Database URL Resolution & Sanitization
# ==========================================

def _sanitize_database_url(raw_url: str) -> tuple[str, dict]:
    """
    Sanitizes database URLs for SQLAlchemy + asyncpg, specifically handling:
    1. Removes 'sslmode' and 'pgbouncer' query parameters which crash asyncpg (TypeError)
    2. Translates 'postgres://' or 'postgresql://' to 'postgresql+asyncpg://'
    3. Handles 'sqlite://' -> 'sqlite+aiosqlite://'
    4. Enforces ssl='require' and statement_cache_size=0 for Supabase transaction pooler
    """
    if not raw_url or not raw_url.strip():
        return "sqlite+aiosqlite:///./forensic_local.db", {"check_same_thread": False}

    url = raw_url.strip()

    # Local SQLite
    if url.startswith("sqlite://") or url.startswith("sqlite+aiosqlite://"):
        if not url.startswith("sqlite+aiosqlite://"):
            url = url.replace("sqlite://", "sqlite+aiosqlite://", 1)
        return url, {"check_same_thread": False}

    # PostgreSQL / Supabase
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://") and not url.startswith("postgresql+asyncpg://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Parse query parameters to strip sslmode and pgbouncer from URL string
    parsed = urllib.parse.urlsplit(url)
    query_params = urllib.parse.parse_qs(parsed.query, keep_blank_values=True)

    # Remove query parameters that asyncpg rejects as unexpected keyword arguments
    unsupported_asyncpg_params = ["sslmode", "pgbouncer"]
    for p in unsupported_asyncpg_params:
        query_params.pop(p, None)

    # Check for direct connection IPv6 warning on Supabase
    if "supabase.co:5432" in parsed.netloc:
        logger.info(
            "[Database] Connecting to direct Supabase host (port 5432). "
            "If your network does not route IPv6, use Supabase Transaction Pooler (port 6543 / pooler.supabase.com)."
        )

    # Reconstruct clean query string
    new_query = urllib.parse.urlencode([(k, v[0]) for k, v in query_params.items()])
    clean_url = urllib.parse.urlunsplit((parsed.scheme, parsed.netloc, parsed.path, new_query, parsed.fragment))

    # Configure connect_args for asyncpg
    connect_args = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
        "ssl": "require",
    }

    return clean_url, connect_args


raw_db_url = (
    os.getenv("DATABASE_URL")
    or os.getenv("SUPABASE_DATABASE_URL")
    or getattr(settings, "DATABASE_URL", None)
    or ""
).strip()

DATABASE_URL, connect_args = _sanitize_database_url(raw_db_url)

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    expire_on_commit=False,
    class_=AsyncSession,
)

Base = declarative_base()


def utcnow():
    return datetime.now(timezone.utc)


# ==========================================
# 3. Database Models
# ==========================================

class OfficerModel(Base):
    __tablename__ = "officers"

    id = Column(UniversalUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    badge_number = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=False)
    rank = Column(String(80), nullable=False)
    department = Column(
        String(120),
        nullable=False,
        default="Bengaluru City Police - Cyber & Forensic Division",
    )
    role = Column(String(40), nullable=False, default="investigator")
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    cases = relationship("CaseModel", back_populates="lead_officer")


class CaseModel(Base):
    __tablename__ = "cases"

    id = Column(UniversalUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_number = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    incident_date = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    location = Column(String(200), nullable=False)
    witness_alias = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False, default="active")
    render_style = Column(String(40), nullable=False, default="forensic_graphite")
    case_seed = Column(BigInteger, nullable=False)
    current_facial_state = Column(UniversalJSON, nullable=False, default=dict)
    current_iteration_id = Column(UniversalUUID, nullable=True)
    lead_officer_id = Column(UniversalUUID, ForeignKey("officers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    lead_officer = relationship("OfficerModel", back_populates="cases")
    iterations = relationship("SketchIterationModel", back_populates="case", cascade="all, delete-orphan")


class SketchIterationModel(Base):
    __tablename__ = "sketch_iterations"

    id = Column(UniversalUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(UniversalUUID, ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    iteration_number = Column(Integer, nullable=False)
    parent_iteration_id = Column(UniversalUUID, nullable=True)
    witness_prompt = Column(Text, nullable=False)
    compiled_diffusion_prompt = Column(Text, nullable=False)
    facial_state_snapshot = Column(UniversalJSON, nullable=False)
    changed_traits = Column(UniversalJSON, nullable=False, default=list)
    image_url = Column(Text, nullable=False)
    high_res_image_url = Column(Text, nullable=True)
    ai_provider_used = Column(String(60), nullable=False, default="gemini-2.5-flash-image")
    generation_latency_ms = Column(Integer, nullable=False, default=0)
    witness_likeness_score = Column(Integer, nullable=True)
    created_by_officer_id = Column(UniversalUUID, ForeignKey("officers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("CaseModel", back_populates="iterations")


class MugshotDatabaseModel(Base):
    __tablename__ = "mugshot_database"

    id = Column(UniversalUUID, primary_key=True, default=lambda: str(uuid.uuid4()))
    record_code = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    height_cm = Column(Integer, nullable=False)
    prior_offenses = Column(UniversalList, nullable=False, default=list)
    last_known_area = Column(String(150), nullable=False)
    image_path = Column(Text, nullable=False)
    facial_attributes = Column(UniversalJSON, nullable=False, default=dict)
    embedding_json = Column(UniversalJSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class AccessAuditLogModel(Base):
    __tablename__ = "access_audit_logs"

    seq_id = Column(Integer, primary_key=True, autoincrement=True)
    id = Column(UniversalUUID, unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    officer_id = Column(UniversalUUID, ForeignKey("officers.id"), nullable=False, index=True)
    badge_number = Column(String(50), nullable=False)
    officer_name = Column(String(120), nullable=False)
    case_id = Column(UniversalUUID, ForeignKey("cases.id", ondelete="SET NULL"), nullable=True, index=True)
    case_number = Column(String(64), nullable=True)
    action_type = Column(String(60), nullable=False, index=True)
    resource_target = Column(String(200), nullable=False)
    ip_address = Column(String(64), nullable=False, default="127.0.0.1")
    user_agent = Column(Text, nullable=False, default="ForensicTerminal/1.0")
    details_json = Column(UniversalJSON, nullable=False, default=dict)
    prev_hash = Column(String(64), nullable=False)
    row_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


# ==========================================
# 4. Helpers & Seeding with Graceful Fallback
# ==========================================

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    global engine, AsyncSessionLocal, DATABASE_URL

    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info(f"[Database] Initialized tables successfully via {DATABASE_URL.split('@')[-1] if '@' in DATABASE_URL else DATABASE_URL}")
    except Exception as db_err:
        if "sqlite" not in DATABASE_URL:
            logger.warning(
                f"[Database] Remote PostgreSQL/Supabase connection failed ({db_err}). "
                "Activating automatic fallback to local SQLite database (forensic_local.db)..."
            )
            DATABASE_URL = "sqlite+aiosqlite:///./forensic_local.db"
            engine = create_async_engine(DATABASE_URL, connect_args={"check_same_thread": False})
            AsyncSessionLocal = async_sessionmaker(bind=engine, expire_on_commit=False, class_=AsyncSession)
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        else:
            raise db_err

    # Seed Demo Officers if not present
    async with AsyncSessionLocal() as session:
        res = await session.execute(select(OfficerModel))
        existing_officers = res.scalars().all()
        if not existing_officers:
            demo_officers = [
                OfficerModel(
                    id="11111111-1111-1111-1111-111111111111",
                    badge_number="KA-4091",
                    full_name="Det. Vikram Rao",
                    rank="Senior Inspector",
                    department="Bengaluru Central Crime Branch",
                    role="investigator",
                ),
                OfficerModel(
                    id="22222222-2222-2222-2222-222222222222",
                    badge_number="KA-1182",
                    full_name="Priya Nair",
                    rank="Lead Forensic Composite Specialist",
                    department="State Forensic Science Laboratory",
                    role="forensic_specialist",
                ),
                OfficerModel(
                    id="33333333-3333-3333-3333-333333333333",
                    badge_number="KA-0045",
                    full_name="Supt. Arjun Mehta",
                    rank="Deputy Commissioner (Audit & Compliance)",
                    department="Internal Security & Evidence Audit",
                    role="supervisor",
                ),
            ]
            session.add_all(demo_officers)
            await session.commit()

        # Seed Demo Case if not present
        res_case = await session.execute(select(CaseModel).where(CaseModel.id == "case-2026-0891"))
        if not res_case.scalar_one_or_none():
            demo_case = CaseModel(
                id="case-2026-0891",
                case_number="CASE-2026-0891",
                title="MG Road Commercial Vault Armed Robbery",
                location="Brigade Road Junction, Bengaluru",
                witness_alias="Witness #4 (Bank Teller)",
                status="active",
                render_style="forensic_graphite",
                case_seed=9204,
                lead_officer_id="11111111-1111-1111-1111-111111111111",
                current_facial_state={
                    "age_gender_ethnicity": "Male in his mid-30s, warm medium-tan complexion",
                    "head_face_shape": "Angular face with high defined cheekbones",
                    "hair_style_texture": "Short cropped dark hair, buzzed sides, slight receding hairline at temples",
                    "forehead": "Standard proportioned smooth forehead",
                    "eyebrows": "Thick arched dark eyebrows with small gap in left arch",
                    "eyes": "Deep-set dark brown eyes with neutral gaze",
                    "nose": "Straight prominent nose with slightly rounded tip",
                    "mouth_lips": "Thin upper lip, slightly fuller lower lip, neutral expression",
                    "jawline_chin": "Prominent square jawline with subtle cleft chin",
                    "ears": "Proportionate ears flat against head",
                    "cheeks": "Defined high cheekbones",
                    "facial_hair": "Sparse 3-day dark stubble along jaw and upper lip",
                    "scars_marks_tattoos": "Small vertical scar through left eyebrow",
                    "accessories": "No glasses or headwear",
                },
            )
            session.add(demo_case)
            await session.commit()
