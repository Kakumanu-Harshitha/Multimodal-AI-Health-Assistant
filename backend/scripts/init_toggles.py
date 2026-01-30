import sys
import os
# Add the parent directory to sys.path to import from backend
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from backend.database import SessionLocal
from backend.models import SystemConfig

def init_toggles():
    db = SessionLocal()
    toggles = [
        {"key": "feature_image_analysis", "value": "ON", "description": "Enable/Disable medical image analysis"},
        {"key": "feature_dermatology_model", "value": "ON", "description": "Enable/Disable specific dermatology model routing"},
        {"key": "feature_confidence_scoring", "value": "ON", "description": "Enable/Disable confidence scoring and safety gates"},
        {"key": "feature_hitl_escalation", "value": "ON", "description": "Enable/Disable Human-in-the-Loop escalation flow"},
    ]
    
    try:
        for t in toggles:
            existing = db.query(SystemConfig).filter(SystemConfig.key == t["key"]).first()
            if not existing:
                config = SystemConfig(**t)
                db.add(config)
        db.commit()
        print("✅ Success: Feature toggles initialized with default values.")
    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    init_toggles()
