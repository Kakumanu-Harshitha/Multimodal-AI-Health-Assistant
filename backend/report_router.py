# backend/report_router.py
from io import BytesIO
import os
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from fpdf import FPDF

from .auth import get_current_user
from .models import User as SQLUser, Profile
from .database import get_db
from . import mongo_memory

router = APIRouter(prefix="/report", tags=["Report"])

# TEXT SANITIZER
def sanitize(text: str) -> str:
    if not text:
        return ""
    # Ensure text is string
    if not isinstance(text, str):
        text = str(text)
    return (
        text
        .replace("’", "'").replace("“", '"').replace("”", '"')
        .encode('latin-1', 'replace').decode('latin-1') 
    )

def normalize_report_data(data: dict) -> dict:
    """
    Normalizes both Old (Flat) and New (Nested) JSON schemas into a standard format for PDF generation.
    """
    normalized = {
        "summary": data.get("summary", "No summary available."),
        "severity": "UNKNOWN",
        "conditions": [],
        "analysis": "",
        "recommendations": [],
        "food_advice": [],
        "red_flags": []
    }

    # 1. Handle New Nested Schema (Google-Level)
    if "risk_assessment" in data:
        risk = data.get("risk_assessment", {})
        normalized["severity"] = risk.get("severity", "UNKNOWN")
        
        explanation = data.get("explanation", {})
        normalized["analysis"] = explanation.get("reasoning", "")
        if explanation.get("history_factor"):
            normalized["analysis"] += f"\n\nHistory Context: {explanation['history_factor']}"
        
        recs = data.get("recommendations", {})
        normalized["recommendations"] = recs.get("lifestyle_advice", [])
        normalized["food_advice"] = recs.get("food_advice", [])
        normalized["sources"] = data.get("knowledge_sources", [])
        
        # Specialist Suggestion
        spec = data.get("recommended_specialist", {})
        if spec:
             normalized["specialist"] = {
                 "type": spec.get("type", "General Physician"),
                 "reason": spec.get("reason", "Standard consultation"),
                 "urgency": spec.get("urgency", "Routine")
             }

        # Treat immediate_action as a Red Flag if high severity
        if recs.get("immediate_action"):
            normalized["red_flags"].append(recs["immediate_action"])
            
        normalized["conditions"] = data.get("possible_causes", [])

    # 2. Handle Old Flat Schema
    else:
        normalized["severity"] = data.get("severity", "UNKNOWN")
        normalized["conditions"] = data.get("possible_conditions", [])
        normalized["analysis"] = data.get("analysis", "")
        
        # Old recommendations might be list or string
        old_recs = data.get("recommendations", [])
        if isinstance(old_recs, list):
            normalized["recommendations"] = old_recs
        elif isinstance(old_recs, str):
             normalized["recommendations"] = [old_recs]
             
        normalized["food_advice"] = data.get("food_recommendations", [])
        normalized["red_flags"] = data.get("red_flags", [])

    return normalized

# PDF CLASS WITH MEDICAL GRADE STYLING
class HealthReportPDF(FPDF):
    def __init__(self):
        super().__init__()
        self.set_auto_page_break(auto=True, margin=15)

    def header(self):
        # HEADER CONTENT 
        self.set_fill_color(255, 255, 255)
        self.rect(0, 0, 210, 40, 'F')
        
        # App Name (Left/Center aligned)
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(44, 62, 80) # Dark Blue
        self.set_xy(12, 12)
        self.cell(0, 10, "HealthGuide AI", ln=True)
        
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(127, 140, 141) # Gray
        self.set_xy(12, 22)
        self.cell(0, 6, "AI Health Assistant - Preliminary Guidance", ln=True)

        # Date (Right)
        self.set_font("Helvetica", "", 9)
        self.set_text_color(100, 100, 100)
        self.set_xy(150, 15)
        self.cell(50, 6, f"Date: {datetime.now().strftime('%Y-%m-%d')}", align="R")
        self.set_xy(150, 20)
        self.cell(50, 6, f"Time: {datetime.now().strftime('%H:%M')}", align="R")

        # Separator line
        self.set_draw_color(52, 152, 219) # Primary Blue
        self.set_line_width(0.5)
        self.line(10, 35, 200, 35)
        self.ln(30)

    def section_title(self, title: str):
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(44, 62, 80)
        self.set_fill_color(236, 240, 241) # Light Gray
        self.cell(0, 10, f"  {title.upper()}", ln=True, fill=True)
        self.ln(4)

    def content_text(self, text: str):
        self.set_font("Helvetica", "", 11)
        self.set_text_color(50, 50, 50)
        self.multi_cell(0, 6, sanitize(text))
        self.ln(4)
        
    def profile_section(self, profile: dict, bmi: str, risk: str):
        self.section_title("Patient Profile")
        
        self.set_font("Helvetica", "", 11)
        
        # Profile Grid
        col_width = 45
        row_height = 8
        
        # Row 1
        self.set_font("Helvetica", "B", 11)
        self.cell(col_width, row_height, "Name:", border=0)
        self.set_font("Helvetica", "", 11)
        self.cell(col_width, row_height, sanitize(profile.get('username', 'N/A')), border=0)
        
        self.set_font("Helvetica", "B", 11)
        self.cell(col_width, row_height, "Age / Gender:", border=0)
        self.set_font("Helvetica", "", 11)
        self.cell(col_width, row_height, f"{profile.get('age', 'N/A')} / {profile.get('gender', 'N/A')}", border=0, ln=True)
        
        # Row 2
        self.set_font("Helvetica", "B", 11)
        self.cell(col_width, row_height, "Height / Weight:", border=0)
        self.set_font("Helvetica", "", 11)
        self.cell(col_width, row_height, f"{profile.get('height_cm', 'N/A')}cm / {profile.get('weight_kg', 'N/A')}kg", border=0)
        
        self.set_font("Helvetica", "B", 11)
        self.cell(col_width, row_height, "BMI:", border=0)
        self.set_font("Helvetica", "", 11)
        self.cell(col_width, row_height, str(bmi), border=0, ln=True)
        
        self.ln(4)
        
        # Risk Rating Badge
        self.set_font("Helvetica", "B", 12)
        self.cell(30, 10, "Risk Rating:", border=0)
        
        # Color coding for risk
        risk_upper = risk.upper()
        if "HIGH" in risk_upper or "EMERGENCY" in risk_upper:
            self.set_fill_color(231, 76, 60) # Red
            self.set_text_color(255, 255, 255)
        elif "MODERATE" in risk_upper or "MEDIUM" in risk_upper:
            self.set_fill_color(241, 196, 15) # Yellow/Orange
            self.set_text_color(50, 50, 50)
        else:
            self.set_fill_color(46, 204, 113) # Green
            self.set_text_color(255, 255, 255)
            
        self.cell(40, 8, f"  {risk_upper}  ", border=0, fill=True, align="C")
        self.set_text_color(0, 0, 0) # Reset
        self.ln(10)

    def footer(self):
        self.set_y(-25)
        self.set_draw_color(200, 200, 200)
        self.line(10, self.get_y(), 200, self.get_y())
        self.ln(2)
        
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(128, 128, 128)
        self.multi_cell(0, 4, "DISCLAIMER: This report is generated by an AI system for informational purposes only. It is NOT a medical diagnosis. Always consult a qualified healthcare provider.", align="C")
        
        self.set_y(-10)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

# REPORT ENDPOINT
@router.get("/user/{username}")
def generate_user_report(
    username: str,
    current_user: SQLUser = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    if username != current_user.username:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # 1. Fetch Profile
    profile_obj = db.query(Profile).filter(Profile.username == username).first()
    profile_data = {
        "username": username,
        "age": str(profile_obj.age) if profile_obj and profile_obj.age else "N/A",
        "gender": profile_obj.gender if profile_obj and profile_obj.gender else "N/A",
        "height_cm": str(profile_obj.height_cm) if profile_obj and profile_obj.height_cm else "N/A",
        "weight_kg": str(profile_obj.weight_kg) if profile_obj and profile_obj.weight_kg else "N/A",
    }
    
    # Calculate BMI
    bmi = "N/A"
    if profile_obj and profile_obj.height_cm and profile_obj.weight_kg:
        try:
            h_m = profile_obj.height_cm / 100
            bmi_val = profile_obj.weight_kg / (h_m * h_m)
            bmi = f"{bmi_val:.1f}"
        except:
            pass

    # 2. Fetch Latest Report from History
    full_history = mongo_memory.get_full_history_for_dashboard(str(current_user.id), limit=20)
    
    raw_report = None
    if full_history:
        for msg in reversed(full_history):
            if msg.get("role") == "assistant":
                try:
                    content = msg.get("content", "")
                    parsed = json.loads(content)
                    # Heuristic to check if it's a report
                    if "summary" in parsed: 
                        raw_report = parsed
                        break
                except:
                    continue
    
    if not raw_report:
        raw_report = {"summary": "No report found."}

    # 3. Normalize Data
    report = normalize_report_data(raw_report)

    # 4. Generate PDF
    pdf = HealthReportPDF()
    pdf.add_page()
    
    # Profile Section
    pdf.profile_section(profile_data, bmi, report["severity"])
    
    # Quick Summary
    pdf.section_title("Quick Health Summary")
    pdf.content_text(report["summary"])
    
    # AI Insights
    pdf.section_title("AI Insights & Analysis")
    pdf.set_font("Helvetica", "I", 10)
    pdf.cell(0, 6, "Note: These are potential possibilities based on symptoms, NOT a diagnosis.", ln=True)
    pdf.ln(2)
    
    # Conditions
    if report["conditions"]:
        pdf.set_font("Helvetica", "B", 11)
        pdf.cell(0, 8, "Possible Conditions:", ln=True)
        pdf.set_font("Helvetica", "", 11)
        for cond in report["conditions"]:
             pdf.cell(5) 
             pdf.cell(0, 6, f"- {sanitize(cond)}", ln=True)
        pdf.ln(2)
        
    # Detailed Analysis
    if report["analysis"]:
        pdf.content_text(report["analysis"])

    # Specialist Suggestion (New Feature)
    if report.get("specialist"):
        spec = report["specialist"]
        pdf.ln(4)
        pdf.set_fill_color(232, 248, 245) # Teal/Mint Light
        pdf.set_text_color(22, 160, 133)   # Teal Dark
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 10, f"  CONSULTATION: {sanitize(spec['type'])}", ln=True, fill=True)
        
        pdf.set_text_color(50, 50, 50)
        pdf.set_font("Helvetica", "I", 11)
        pdf.cell(5)
        pdf.cell(0, 8, f"Urgency: {spec['urgency']}", ln=True)
        
        pdf.set_font("Helvetica", "", 11)
        pdf.cell(5)
        pdf.multi_cell(0, 6, f"Reason: {sanitize(spec['reason'])}")
        pdf.ln(4)

    # Recommendations
    pdf.section_title("Recommendations")
    if report["recommendations"]:
        for rec in report["recommendations"]:
            pdf.cell(5)
            pdf.multi_cell(0, 6, f"- {sanitize(str(rec))}")
            pdf.ln(1)
    
    # Food & Diet
    if report["food_advice"]:
        pdf.section_title("Food & Diet Recommendations")
        for item in report["food_advice"]:
            pdf.cell(5)
            pdf.multi_cell(0, 6, f"- {sanitize(str(item))}")
            pdf.ln(1)

    # Trusted Sources
    if report.get("sources"):
        pdf.ln(4)
        pdf.section_title("Trusted Medical Sources")
        for src in report["sources"]:
            # Handle both dict (new schema) and string (fallback)
            if isinstance(src, dict):
                source_name = src.get("source", "Unknown Source")
                desc = src.get("description", "")
            else:
                source_name = "Source"
                desc = str(src)

            pdf.set_font("Helvetica", "B", 10)
            pdf.set_text_color(41, 128, 185) # Blue
            pdf.cell(0, 5, f"- {sanitize(source_name)}", ln=True)
            
            pdf.set_font("Helvetica", "", 10)
            pdf.set_text_color(80, 80, 80)
            pdf.multi_cell(0, 5, f"  {sanitize(desc)}")
            pdf.ln(2)

    # Disclaimer
    pdf.ln(10)
    pdf.set_font("Helvetica", "I", 9)
    pdf.set_text_color(150, 150, 150)
    pdf.multi_cell(0, 5, "DISCLAIMER: This report is generated by AI for informational purposes only. It is NOT a medical diagnosis. Always consult a qualified healthcare provider for any medical concerns.")
    
    # Red Flags / Immediate Action
    if report["red_flags"]:
        pdf.ln(4)
        pdf.set_fill_color(255, 235, 238) # Light Red
        pdf.set_text_color(198, 40, 40)   # Dark Red
        pdf.set_font("Helvetica", "B", 12)
        pdf.cell(0, 10, "  IMMEDIATE ATTENTION REQUIRED", ln=True, fill=True)
        pdf.set_text_color(198, 40, 40)
        pdf.set_font("Helvetica", "", 11)
        for flag in report["red_flags"]:
            pdf.cell(5)
            pdf.multi_cell(0, 6, f">> {sanitize(str(flag))}")
        pdf.ln(4)
        
    # Output
    pdf_content = pdf.output(dest='S').encode('latin-1')
    pdf_buffer = BytesIO(pdf_content)
    
    filename = f"HealthReport_{username}_{datetime.now().strftime('%Y%m%d')}.pdf"
    
    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
