
import pytest
import numpy as np
from backend.report_processor import report_processor

def test_validate_extracted_text_valid():
    """Test that validate_extracted_text returns True for text with medical keywords."""
    valid_text = "Patient Hemoglobin count is 14.5 g/dl. CBC results are normal."
    assert report_processor.validate_extracted_text(valid_text) is True

def test_validate_extracted_text_invalid():
    """Test that validate_extracted_text returns False for irrelevant text."""
    invalid_text = "The quick brown fox jumps over the lazy dog."
    assert report_processor.validate_extracted_text(invalid_text) is False

def test_validate_extracted_text_empty():
    """Test that validate_extracted_text returns False for empty text."""
    assert report_processor.validate_extracted_text("") is False
    assert report_processor.validate_extracted_text("   ") is False

def test_preprocess_image_output_shape():
    """Test that preprocess_image returns a valid image (numpy array)."""
    # Create a dummy white image
    dummy_image = np.ones((100, 100, 3), dtype=np.uint8) * 255
    processed = report_processor.preprocess_image(dummy_image)
    
    assert isinstance(processed, np.ndarray)
    assert len(processed.shape) == 2  # Should be grayscale
