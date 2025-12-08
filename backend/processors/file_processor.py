import pydicom
import pdfplumber
import docx
from PIL import Image
import cv2
import easyocr
import os

class FileProcessor:
    def __init__(self, use_vision_ai=True):
        self.ocr_reader = easyocr.Reader(['en'])
        self.use_vision_ai = use_vision_ai
        self.vision_processor = None
        
        # Lazy load vision processor if needed
        if use_vision_ai:
            try:
                from processors.vision_processor import get_vision_processor
                self.vision_processor = get_vision_processor()
            except ImportError:
                print("Warning: Vision processor not available, using OCR only")
                self.use_vision_ai = False
    
    def process_file(self, file_path):
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext in ['.pdf']:
            return self.extract_text_from_pdf(file_path)
        elif ext in ['.docx']:
            return self.extract_text_from_docx(file_path)
        elif ext in ['.jpg', '.jpeg', '.png']:
            return self.extract_text_from_image(file_path)
        elif ext in ['.dcm']:
            return self.extract_text_from_dicom(file_path)
        else:
            raise ValueError(f"Unsupported file type: {ext}")
    
    def extract_text_from_image(self, image_path):
        """Extract text from image using OCR and optionally BLIP captioning"""
        # Use EasyOCR for text extraction
        ocr_result = self.ocr_reader.readtext(image_path, detail=0)
        ocr_text = "\n".join(ocr_result)
        
        # If vision AI is enabled, add BLIP caption
        if self.use_vision_ai and self.vision_processor:
            try:
                caption = self.vision_processor.caption_image(image_path)
                combined_text = f"Image Caption (BLIP): {caption}\n\nOCR Text:\n{ocr_text}"
                return combined_text
            except Exception as e:
                print(f"Error generating caption: {e}")
                return ocr_text
        
        return ocr_text
    
    def extract_text_from_pdf(self, pdf_path):
        all_text = []
        with pdfplumber.open(pdf_path) as pdf:
            for page in pdf.pages:
                all_text.append(page.extract_text() or "")
        return "\n".join(all_text)
    
    def extract_text_from_docx(self, docx_path):
        doc = docx.Document(docx_path)
        return "\n".join([p.text for p in doc.paragraphs])
    
    def extract_text_from_dicom(self, dicom_path):
        ds = pydicom.dcmread(dicom_path)
        meta_text = []
        for elem in ds:
            if elem.VR in ["LO", "PN", "SH", "CS", "DA", "TM", "UI", "ST", "LT", "UT"]:
                if elem.value and isinstance(elem.value, str):
                    meta_text.append(f"{elem.name}: {elem.value}")
        
        meta_text_str = "\n".join(meta_text)
        pixel_text = ""
        
        if 'PixelData' in ds:
            try:
                img = ds.pixel_array
                if img.dtype != 'uint8':
                    img = cv2.convertScaleAbs(img)
                temp_file = "/tmp/temp_dicom_img.png"
                cv2.imwrite(temp_file, img)
                pixel_text = self.extract_text_from_image(temp_file)
            except:
                pixel_text = "Pixel OCR error"
        
        return meta_text_str + ("\n\nOCR from pixel data:\n" + pixel_text if pixel_text else "")
