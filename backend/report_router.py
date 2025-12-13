# backend/report_router.py
from io import BytesIO
import os
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from fpdf import FPDF

from .auth import get_current_user
from .models import User as SQLUser, Profile
from .database import get_db
from . import mongo_memory, llm_service
from .dashboard_service import extract_recent_symptoms

router = APIRouter(prefix="/report", tags=["Report"])


# -----------------------------
# TEXT SANITIZER (NO UNICODE)
# -----------------------------
def sanitize(text: str) -> str:
    return (
        str(text)
        .replace("✓", "-")
        .replace("–", "-")
        .replace("—", "-")
        .replace("’", "'")
        .replace("‘", "'")
        .replace("“", '"')
        .replace("”", '"')
    )


# -----------------------------
# PDF CLASS WITH BORDER & LOGO
# -----------------------------
class HealthReportPDF(FPDF):
    def header(self):
        # -------------------------
        # HEADER CONTENT (NO BORDER)
        # -------------------------
        base_dir = os.path.dirname(os.path.abspath(__file__))
        logo_path = os.path.join(base_dir, "assets", "aidoctor.jpg")

        # Logo (top-left)
        if os.path.exists(logo_path):
            self.image(logo_path, x=12, y=10, w=22)

        # Title (center)
        self.set_font("Helvetica", "B", 16)
        self.set_y(14)
        self.cell(0, 12, "AI HEALTH ASSISTANT - HEALTH REPORT", ln=True, align="C")

        # Separator line
        self.ln(6)

        # -------------------------
        # PAGE BORDER (BELOW HEADER)
        # -------------------------
        self.set_draw_color(180, 180, 180)
        self.rect(
            8,                 # x
            self.get_y(),      # y (below header)
            194,               # width
            270 - self.get_y() # height
        )

    def section(self, title: str, text: str):
        # Section title
        self.set_font("Helvetica", "B", 13)
        self.cell(0, 8, sanitize(title), ln=True)
        self.ln(1)

        # Section content with light background
        self.set_font("Helvetica", "", 11)
        self.set_fill_color(245, 247, 250)
        self.multi_cell(0, 6, sanitize(text), fill=True)
        self.ln(5)

    def footer(self):
        self.set_y(-18)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(
            0, 8,
            "AI-generated report | For informational purposes only | Not a medical diagnosis",
            align="C"
        )

  
# -----------------------------
# REPORT ENDPOINT
# -----------------------------
@router.get("/user/{username}")
def generate_user_report(
    username: str,
    current_user: SQLUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if username != current_user.username:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Fetch profile
    profile_obj = db.query(Profile).filter(Profile.username == username).first()
    profile = {
        "age": profile_obj.age if profile_obj else "N/A",
        "gender": profile_obj.gender if profile_obj else "N/A",
        "allergies": profile_obj.allergies if profile_obj else "None",
        "chronic_diseases": profile_obj.chronic_diseases if profile_obj else "None",
    }

    # Fetch history
    history = mongo_memory.get_full_history_for_dashboard(
        str(current_user.id), limit=50
    ) or []

    recent_symptoms = extract_recent_symptoms(history)
    past_context = " ".join([h.get("content", "") for h in history[-5:]])

    # LLM insights
    insights = llm_service.generate_health_report_insights(
        profile=profile,
        recent_symptoms=recent_symptoms,
        past_context=past_context,
    )

    # Create PDF
    pdf = HealthReportPDF()
    pdf.add_page()

    pdf.section(
        "User Information",
        f"Name: {username}\n"
        f"Age: {profile['age']}\n"
        f"Gender: {profile['gender']}\n"
        f"Allergies: {profile['allergies']}\n"
        f"Chronic Conditions: {profile['chronic_diseases']}"
    )

    pdf.section("Health Summary", insights["summary"])
    pdf.section("Medical Interpretation", insights["interpretation"])
    pdf.section("Food & Lifestyle Recommendations", insights["food_recommendations"])

    # SAFE OUTPUT
    pdf_output = pdf.output(dest="S")
    if isinstance(pdf_output, (bytes, bytearray)):
        pdf_bytes = bytes(pdf_output)
    else:
        pdf_bytes = pdf_output.encode("latin-1")

    return StreamingResponse(
        BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={
            "Content-Disposition":
            f'attachment; filename="health_report_{username}.pdf"'
        },
    )
