# backend/main.py
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from .auth import router as auth_router
from .profile_router import router as profile_router
from .report_router import router as report_router
from .feedback_router import router as feedback_router
from . import query_service, dashboard_service  
from . import models  
import os

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AI Health Assistant API")

# Mount static directory for audio
static_dir = os.path.join(os.path.dirname(__file__), "static")
if not os.path.exists(static_dir):
    os.makedirs(static_dir)
app.mount("/static", StaticFiles(directory=static_dir), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth_router)
app.include_router(profile_router)
app.include_router(report_router)
app.include_router(feedback_router)
app.include_router(query_service.router)
app.include_router(dashboard_service.router)

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Health Assistant API"}
