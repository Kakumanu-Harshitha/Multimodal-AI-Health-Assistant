import cv2
import io
import re
import easyocr
import numpy as np
import fitz  # PyMuPDF
from PIL import Image
from typing import Optional, List, Dict

class ReportProcessor:
    def __init__(self):
        # Initialize the OCR reader once to avoid overhead
        try:
            # Using CPU for OCR as per requirements
            self.reader = easyocr.Reader(['en'], gpu=False)
            print("✅ EasyOCR (CPU) initialized for medical report processing.")
        except Exception as e:
            print(f"⚠️ EasyOCR Initialization Warning: {e}")
            self.reader = None

    def validate_file(self, file_bytes: bytes, filename: str) -> Optional[str]:
        """
        STEP 1: File Validation
        Reject invalid inputs early.
        """
        # 1. File type check
        if not filename.lower().endswith(('.pdf', '.jpg', '.jpeg', '.png')):
            return "Invalid file type. Please upload a PDF or an image (JPG/PNG)."
        
        # 2. File size check (e.g., 10MB)
        if len(file_bytes) > 10 * 1024 * 1024:
            return "File too large. Please upload a report smaller than 10MB."
            
        return None

    def preprocess_image(self, image_np: np.ndarray) -> np.ndarray:
        """
        STEP 2: OCR PREPROCESSING (MANDATORY)
        Improve resolution, convert to Grayscale, Denoise, and Thresholding.
        """
        try:
            # 1. Convert to grayscale
            if len(image_np.shape) == 3:
                gray = cv2.cvtColor(image_np, cv2.COLOR_RGB2GRAY)
            else:
                gray = image_np

            # 2. Improve Resolution (Upscale if small to reach ≈300 DPI equivalent)
            # Assuming standard mobile photo is ~72 DPI, upscale by 4x for 288 DPI
            h, w = gray.shape[:2]
            if w < 2000:
                scale_factor = 2000 / w
                gray = cv2.resize(gray, None, fx=scale_factor, fy=scale_factor, interpolation=cv2.INTER_CUBIC)

            # 3. Denoising
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)

            # 4. Increase Contrast / Adaptive thresholding
            thresh = cv2.adaptiveThreshold(
                denoised, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )

            # 5. Deskew image to fix tilted text
            coords = np.column_stack(np.where(thresh > 0))
            if coords.size > 0:
                angle = cv2.minAreaRect(coords)[-1]
                if angle < -45:
                    angle = -(90 + angle)
                else:
                    angle = -angle
                
                (h, w) = thresh.shape[:2]
                center = (w // 2, h // 2)
                M = cv2.getRotationMatrix2D(center, angle, 1.0)
                deskewed = cv2.warpAffine(thresh, M, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)
                return deskewed

            return thresh
        except Exception as e:
            print(f"⚠️ Preprocessing Warning: {e}. Using original image.")
            return image_np

    def validate_extracted_text(self, text: str) -> bool:
        """
        STEP 4: OCR VALIDATION (CRITICAL)
        Contains digits AND at least one medical keyword or unit.
        """
        if not text or len(text.strip()) < 10:
            return False
            
        # Comprehensive list of medical keywords and units
        medical_identifiers = [
            'hb', 'hemoglobin', 'wbc', 'rbc', 'glucose', 'cholesterol', 'sugar',
            'platelet', 'count', 'range', 'result', 'value', 'cbc', 'lipid',
            'g/dl', 'mg/dl', 'mmol/l', '%', 'cells/ul', 'units/l', 'fl', 'pg',
            'microgram', 'vitamin', 'thyroid', 'tsh', 'creatinine', 'urea'
        ]
        
        text_lower = text.lower()
        has_identifier = any(ident in text_lower for ident in medical_identifiers)
        has_digits = bool(re.search(r'\d+', text))
        
        # Valid if it has both digits and medical context
        return has_identifier and has_digits

    def parse_lab_data(self, text: str) -> str:
        """
        STEP 5 & 6: Lab Data Parsing & Rule-Based Interpretation
        Extracts markers, values, and ranges using regex.
        """
        # Common patterns for lab results: "TestName Result [Status] Range Unit"
        patterns = [
            # CBC Table Style: Name Value [Status] Low - High Unit
            r"([a-zA-Z\s\(\)\.]+)\s+(\d+\.?\d*)\s+(?:Low|High|Borderline|Normal|)\s*(\d+\.?\d*)\s*-\s*(\d+\.?\d*)\s+([a-zA-Z/%/]+)",
            # Pattern: Name Result Unit (Range)
            r"([a-zA-Z\s\(\)\.]+)\s+(\d+\.?\d*)\s*([a-zA-Z/%/]+)\s*[\(\[]?(\d+\.?\d*)\s*-\s*(\d+\.?\d*)[\)\]]?",
            # Pattern: Name Result (Range)
            r"([a-zA-Z\s\(\)\.]+)\s+(\d+\.?\d*)\s*[\(\[]?(\d+\.?\d*)\s*-\s*(\d+\.?\d*)[\)\]]?",
            # Pattern: Name: Result
            r"([a-zA-Z\s\(\)\.]+):\s*(\d+\.?\d*)"
        ]
        
        parsed_results = []
        lines = text.split('\n')
        
        for line in lines:
            line = line.strip()
            if not line: continue
            
            for pattern in patterns:
                match = re.search(pattern, line)
                if match:
                    groups = match.groups()
                    name = groups[0].strip()
                    try:
                        value = float(groups[1])
                    except ValueError:
                        continue
                    
                    # Deterministic Interpretation
                    status = "Normal"
                    
                    # If we have 5 groups (Table or Pattern 1)
                    if len(groups) == 5:
                        try:
                            # Group 2 and 3 are low/high in Pattern 1, or group 3 and 4 in Pattern 2
                            # We detect based on which ones are numeric
                            if "-" in text[match.start():match.end()]:
                                low = float(groups[2]) if groups[2].replace('.','',1).isdigit() else float(groups[3])
                                high = float(groups[3]) if groups[3].replace('.','',1).isdigit() else float(groups[4])
                                unit = groups[4] if not groups[4].replace('.','',1).isdigit() else groups[2]
                                
                                if value < low: status = "Low"
                                elif value > high: status = "High"
                                parsed_results.append(f"{name}: {value} {unit} (Range: {low}-{high}) -> {status}")
                            else:
                                parsed_results.append(f"{name}: {value} {groups[2]}")
                        except:
                            parsed_results.append(f"{name}: {value}")
                    elif len(groups) >= 4: # Pattern 3
                        try:
                            low = float(groups[-2])
                            high = float(groups[-1])
                            if value < low: status = "Low"
                            elif value > high: status = "High"
                            parsed_results.append(f"{name}: {value} (Range: {low}-{high}) -> {status}")
                        except:
                            parsed_results.append(f"{name}: {value}")
                    else:
                        parsed_results.append(f"{name}: {value}")
                    break
        
        if parsed_results:
            return "\n".join(parsed_results)
        return text # Fallback to raw text if parsing fails

    def extract_text_from_image(self, file_bytes: bytes) -> str:
        """
        Extracts text from an image file using EasyOCR with robust fallback.
        """
        if not self.reader:
            return ""
            
        try:
            image = Image.open(io.BytesIO(file_bytes)).convert("RGB")
            image_np = np.array(image)
            
            # Attempt 1: Preprocessed image
            processed_img = self.preprocess_image(image_np)
            results = self.reader.readtext(processed_img)
            text = " ".join([res[1] for res in results])
            
            # Attempt 2: Fallback to original image if validation fails
            if not self.validate_extracted_text(text):
                print("🔄 OCR attempt 1 failed validation. Retrying with original image...")
                results = self.reader.readtext(image_np)
                text = " ".join([res[1] for res in results])
                
            return text.strip()
        except Exception as e:
            print(f"❌ OCR Extraction Error: {e}")
            return ""

    def extract_text_from_pdf(self, file_bytes: bytes) -> str:
        """
        STEP 2 & 3: PDF Type Detection & Extraction
        """
        try:
            doc = fitz.open(stream=file_bytes, filetype="pdf")
            
            if len(doc) > 10:
                doc.close()
                return "ERROR: PDF has too many pages. Please upload a report with 10 pages or less."

            full_text = ""
            is_scanned = True
            
            for page in doc:
                page_text = page.get_text().strip()
                if page_text:
                    full_text += page_text + "\n"
                    is_scanned = False
            
            if is_scanned or not full_text.strip():
                print("📄 PDF appears to be scanned. Running OCR pipeline...")
                full_text = ""
                if not self.reader:
                    doc.close()
                    return "ERROR: OCR service unavailable for scanned PDF."
                
                for page in doc:
                    pix = page.get_pixmap(matrix=fitz.Matrix(4.16, 4.16)) 
                    img_bytes = pix.tobytes("png")
                    ocr_text = self.extract_text_from_image(img_bytes)
                    full_text += ocr_text + "\n"
            
            doc.close()
            result = full_text.strip()
            
            if not self.validate_extracted_text(result):
                return "ERROR: We couldn't analyze this report because the text was unclear or unreadable. Please upload the original PDF or a clearer scan."
                
            return self.parse_lab_data(result)
        except Exception as e:
            print(f"❌ PDF Processing Error: {e}")
            return "ERROR: We encountered a problem reading this PDF. Please try uploading a clearer version or the original file."

    def process_report(self, file_bytes: bytes, filename: str) -> Dict[str, str]:
        """
        Unified entry point for report processing.
        Ensures graceful degradation and partial data handling.
        """
        validation_error = self.validate_file(file_bytes, filename)
        if validation_error:
            return {"type": "error", "content": validation_error, "filename": filename}

        filename_lower = filename.lower()
        content = ""

        if filename_lower.endswith(".pdf"):
            content = self.extract_text_from_pdf(file_bytes)
        elif filename_lower.endswith((".jpg", ".jpeg", ".png")):
            content = self.extract_text_from_image(file_bytes)
            # Mandatory check: digits + keywords
            if not content or not self.validate_extracted_text(content):
                content = "ERROR: We couldn't analyze this image because the text was unclear. Please ensure the photo is well-lit and legible."
            else:
                # If OCR passed validation, we MUST provide a response, even if parsing is partial
                content = self.parse_lab_data(content)
        
        if content.startswith("ERROR:"):
            return {"type": "error", "content": content.replace("ERROR: ", ""), "filename": filename}

        return {
            "type": "medical_report_analysis",
            "content": content,
            "filename": filename
        }

# Global instance
report_processor = ReportProcessor()
