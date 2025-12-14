# backend/profile_router.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional
from .database import get_db
from .models import Profile
from .schemas import ProfileIn, ProfileOut
from .auth import get_current_user
from .models import User as SQLUser  # for typing

router = APIRouter(prefix="/profile", tags=["Profile"])
@router.post("/", response_model=ProfileOut, response_model_exclude_none=True)
def create_or_update_profile(
    profile_in: ProfileIn,
    current_user: SQLUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    username = current_user.username
    profile = db.query(Profile).filter(Profile.username == username).first()

    # Create new profile if not exists
    if not profile:
        profile = Profile(username=username)

    # Update only provided fields
    for key, value in profile_in.dict(exclude_none=True).items():
        setattr(profile, key, value)

    profile.updated_at = datetime.utcnow()

    db.add(profile)
    db.commit()
    db.refresh(profile)

    return profile  

@router.get("/", response_model=ProfileOut, response_model_exclude_none=True)
def get_profile(
    current_user: SQLUser = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    username = current_user.username
    profile = db.query(Profile).filter(Profile.username == username).first()
    if not profile:
        return {"username": username}

    return profile  