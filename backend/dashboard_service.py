# backend/dashboard_service.py
from fastapi import APIRouter, Depends
from typing import List, Dict, Any
from .mongo_memory import get_full_history_for_dashboard, clear_user_memory
from .auth import get_current_user
from .models import User

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

@router.get("/history", response_model=List[Dict[str, Any]])
def get_user_history(current_user: User = Depends(get_current_user)):
    return get_full_history_for_dashboard(str(current_user.id), limit=100)

@router.delete("/history")
def clear_history(current_user: User = Depends(get_current_user)):
    clear_user_memory(str(current_user.id))
    return {"message": "Chat history cleared successfully"}
def extract_recent_symptoms(history: List[Dict[str, Any]]) -> str:
    """
    Extracts only recent USER symptom text (last 3 messages).
    """
    symptoms = [
        h["content"]
        for h in history
        if h.get("role") == "user"
    ]
    return " ".join(symptoms[-3:])
