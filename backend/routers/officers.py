from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from db.database import OfficerModel, get_db
from models.schemas import OfficerSchema

router = APIRouter(prefix="/officers", tags=["officers"])

@router.get("", response_model=List[OfficerSchema])
async def list_officers(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(OfficerModel).order_by(OfficerModel.badge_number))
    return result.scalars().all()
