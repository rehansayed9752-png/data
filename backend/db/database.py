from datetime import datetime, timezone
import uuid
import os
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
    select,
)
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import declarative_base, relationship

from config import settings

# 1. Safely resolve DATABASE_URL with automatic fallback to local SQLite
raw_url = getattr(settings, "DATABASE_URL", None) or os.getenv("DATABASE_URL", "")

if not raw_url or raw_url.strip() == "":
    DATABASE_URL = "sqlite+aiosqlite:///./forensic_dev.db"
elif raw_url.startswith("postgres://"):
    DATABASE_URL = raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("postgresql://") and not raw_url.startswith("postgresql+asyncpg://"):
    DATABASE_URL = raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
elif raw_url.startswith("sqlite://") and not raw_url.startswith("sqlite+aiosqlite://"):
    DATABASE_URL = raw_url.replace("sqlite://", "sqlite+aiosqlite://", 1)
else:
    DATABASE_URL = raw_url

# 2. Configure connect arguments for SQLite vs Supabase PostgreSQL
connect_args: Dict[str, Any] = {}
if "sqlite" in DATABASE_URL:
    connect_args = {"check_same_thread": False}
elif "postgresql+asyncpg" in DATABASE_URL:
    # Disable statement cache for Supabase transaction pooler (pgbouncer) and enforce SSL
    connect_args = {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }

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
# Database Models
# ==========================================

class OfficerModel(Base):
    __tablename__ = "officers"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
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

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_number = Column(String(64), unique=True, nullable=False, index=True)
    title = Column(String(200), nullable=False)
    incident_date = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    location = Column(String(200), nullable=False)
    witness_alias = Column(String(100), nullable=False)
    status = Column(String(30), nullable=False, default="active")
    render_style = Column(String(40), nullable=False, default="forensic_graphite")
    case_seed = Column(BigInteger, nullable=False)
    current_facial_state = Column(JSON, nullable=False, default=dict)
    current_iteration_id = Column(String(36), nullable=True)
    lead_officer_id = Column(String(36), ForeignKey("officers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

    lead_officer = relationship("OfficerModel", back_populates="cases")
    iterations = relationship("SketchIterationModel", back_populates="case", cascade="all, delete-orphan")


class SketchIterationModel(Base):
    __tablename__ = "sketch_iterations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    case_id = Column(String(36), ForeignKey("cases.id", ondelete="CASCADE"), nullable=False, index=True)
    iteration_number = Column(Integer, nullable=False)
    parent_iteration_id = Column(String(36), nullable=True)
    witness_prompt = Column(Text, nullable=False)
    compiled_diffusion_prompt = Column(Text, nullable=False)
    facial_state_snapshot = Column(JSON, nullable=False)
    changed_traits = Column(JSON, nullable=False, default=list)
    image_url = Column(Text, nullable=False)
    high_res_image_url = Column(Text, nullable=True)
    ai_provider_used = Column(String(60), nullable=False, default="gemini-2.5-flash-image")
    generation_latency_ms = Column(Integer, nullable=False, default=0)
    witness_likeness_score = Column(Integer, nullable=True)
    created_by_officer_id = Column(String(36), ForeignKey("officers.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)

    case = relationship("CaseModel", back_populates="iterations")


class MugshotDatabaseModel(Base):
    __tablename__ = "mugshot_database"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    record_code = Column(String(50), unique=True, nullable=False, index=True)
    full_name = Column(String(120), nullable=False)
    age = Column(Integer, nullable=False)
    gender = Column(String(20), nullable=False)
    height_cm = Column(Integer, nullable=False)
    prior_offenses = Column(JSON, nullable=False, default=list)
    last_known_area = Column(String(150), nullable=False)
    image_path = Column(Text, nullable=False)
    facial_attributes = Column(JSON, nullable=False, default=dict)
    embedding_json = Column(JSON, nullable=True)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


class AccessAuditLogModel(Base):
    __tablename__ = "access_audit_logs"

    seq_id = Column(BigInteger, primary_key=True, autoincrement=True)
    id = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid.uuid4()))
    officer_id = Column(String(36), ForeignKey("officers.id"), nullable=False, index=True)
    badge_number = Column(String(50), nullable=False)
    officer_name = Column(String(120), nullable=False)
    case_id = Column(String(36), nullable=True, index=True)
    case_number = Column(String(64), nullable=True)
    action_type = Column(String(60), nullable=False, index=True)
    resource_target = Column(String(200), nullable=False)
    ip_address = Column(String(64), nullable=False, default="127.0.0.1")
    user_agent = Column(Text, nullable=False, default="ForensicTerminal/1.0")
    details_json = Column(JSON, nullable=False, default=dict)
    prev_hash = Column(String(64), nullable=False)
    row_hash = Column(String(64), nullable=False)
    created_at = Column(DateTime(timezone=True), default=utcnow, nullable=False)


# ==========================================
# Helpers & Seeding
# ==========================================

async def get_db():
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

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