import io
from pypdf import PdfReader
from typing import Optional, List, Dict

class ReportProcessor:
    @staticmethod
    def extract_text_from_pdf(file_bytes: bytes) -> str:
        """
        Extracts text from a PDF file byte stream.
        """
        try:
            reader = PdfReader(io.BytesIO(file_bytes))
            text = ""
            for page in reader.pages:
                page_text = page.extract_text()
                if page_text:
                    text += page_text + "\n"
            return text.strip()
        except Exception as e:
            print(f"❌ PDF Extraction Error: {e}")
            return ""

    @staticmethod
    def process_report(file_bytes: bytes, filename: str) -> Dict[str, str]:
        """
        Determines file type and extracts text.
        Returns a dictionary with 'type' and 'content'.
        """
        filename_lower = filename.lower()
        content = ""
        report_type = "unknown"

        if filename_lower.endswith(".pdf"):
            report_type = "pdf"
            content = ReportProcessor.extract_text_from_pdf(file_bytes)
        elif filename_lower.endswith((".jpg", ".jpeg", ".png")):
            report_type = "image"
            # TODO: Implement OCR for images (requires Tesseract or similar)
            # For now, we return a placeholder or rely on the multimodal description if passed elsewhere
            content = "[Image Report Uploaded - OCR Not Available in this environment. Please upload PDF for text extraction.]"
        
        return {
            "type": report_type,
            "content": content,
            "filename": filename
        }

report_processor = ReportProcessor()
