# backend/schemas.py
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

# --- Auth schemas ---
class TokenOut(BaseModel):
    access_token: str
    token_type: str
    user_id: int
    username: str

class UserCreate(BaseModel):
    username: str
    password: str

# --- Profile schemas ---
class ProfileIn(BaseModel):
    age: Optional[int] = None
    gender: Optional[str] = None
    weight_kg: Optional[float] = None
    height_cm: Optional[float] = None
    allergies: Optional[str] = None
    health_goals: Optional[str] = None
    chronic_diseases: Optional[str] = None

class ProfileOut(ProfileIn):
    username: str
    updated_at: Optional[datetime] = None

    class Config:
        orm_mode = True
