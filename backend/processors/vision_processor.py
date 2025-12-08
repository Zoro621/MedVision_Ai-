"""
Vision Processor Module - CLIP Captioning + GradCAM Visualization + DICOM Processing
Integrates BLIP for image captioning, ResNet50 + GradCAM for explainability, and DICOM medical imaging
"""

import torch
import numpy as np
from PIL import Image, ImageDraw
import io
import base64
import matplotlib.pyplot as plt
from transformers import BlipProcessor, BlipForConditionalGeneration
from torchvision import models, transforms as T
from captum.attr import LayerGradCam, LayerAttribution
import pydicom
from pydicom.uid import ImplicitVRLittleEndian

# Force CUDA initialization if available
if torch.cuda.is_available():
    try:
        # Initialize CUDA device
        _ = torch.cuda.current_device()
        _ = torch.tensor([1.0]).cuda()
    except Exception as e:
        print(f"Warning: CUDA initialization failed - {e}")


class VisionProcessor:
    def __init__(self):
        """Initialize BLIP and ResNet50 models for vision processing"""
        # Force CUDA check and initialization
        if torch.cuda.is_available():
            try:
                # Try to initialize CUDA
                torch.cuda.init()
                torch.cuda.set_device(0)
                self.device = "cuda"
            except Exception as e:
                print(f"CUDA initialization failed: {e}, falling back to CPU")
                self.device = "cpu"
        else:
            self.device = "cpu"
        print(f"Vision Processor using device: {self.device}")
        
        # Initialize BLIP for image captioning
        self.blip_processor = None
        self.blip_model = None
        
        # Initialize ResNet50 for GradCAM
        self.resnet = None
        self.target_layer = None
        self.gradcam = None
        
        # Image transformation pipeline
        self.transform = T.Compose([
            T.Resize((224, 224)),
            T.ToTensor(),
            T.Normalize(
                mean=[0.485, 0.456, 0.406],
                std=[0.229, 0.224, 0.225]
            )
        ])
        
    def load_models(self):
        """Lazy load models only when needed to save memory"""
        try:
            # Load BLIP model
            if self.blip_processor is None:
                print("Loading BLIP model...")
                self.blip_processor = BlipProcessor.from_pretrained(
                    "Salesforce/blip-image-captioning-base"
                )
                self.blip_model = BlipForConditionalGeneration.from_pretrained(
                    "Salesforce/blip-image-captioning-base"
                ).to(self.device)
                self.blip_model.eval()
                print("✅ BLIP model loaded successfully")
            
            # Load ResNet50 for GradCAM
            if self.resnet is None:
                print("Loading ResNet50 model...")
                self.resnet = models.resnet50(pretrained=True)
                self.resnet = self.resnet.to(self.device)
                self.resnet.eval()
                self.target_layer = self.resnet.layer4[-1]
                self.gradcam = LayerGradCam(self.resnet, self.target_layer)
                print("✅ ResNet50 model loaded successfully")
                
            return True
        except Exception as e:
            print(f"Error loading models: {e}")
            return False
    
    def caption_image(self, image_path_or_bytes):
        """
        Generate caption for an image using BLIP
        
        Args:
            image_path_or_bytes: Path to image file or bytes
            
        Returns:
            str: Generated caption
        """
        try:
            # Load models if not already loaded
            if not self.load_models():
                return "Error: Failed to load BLIP model"
            
            # Load image
            if isinstance(image_path_or_bytes, (str, bytes)):
                if isinstance(image_path_or_bytes, str):
                    image = Image.open(image_path_or_bytes).convert("RGB")
                else:
                    image = Image.open(io.BytesIO(image_path_or_bytes)).convert("RGB")
            else:
                image = image_path_or_bytes
            
            # Process image
            inputs = self.blip_processor(
                images=image,
                return_tensors="pt"
            ).to(self.device)
            
            # Generate caption
            with torch.no_grad():
                output = self.blip_model.generate(
                    **inputs,
                    max_length=60
                )
            
            caption = self.blip_processor.decode(output[0], skip_special_tokens=True)
            return caption
            
        except Exception as e:
            print(f"Error generating caption: {e}")
            return f"Error: {str(e)}"
    
    def generate_gradcam(self, image_path_or_bytes, return_base64=True):
        """
        Generate GradCAM visualization for an image
        
        Args:
            image_path_or_bytes: Path to image file or bytes
            return_base64: If True, returns base64 encoded images
            
        Returns:
            dict: Contains original image, heatmap, overlay, predicted class, and optionally base64 images
        """
        try:
            # Load models if not already loaded
            if not self.load_models():
                return {"error": "Failed to load ResNet50 model"}
            
            # Load image
            if isinstance(image_path_or_bytes, (str, bytes)):
                if isinstance(image_path_or_bytes, str):
                    image = Image.open(image_path_or_bytes).convert("RGB")
                else:
                    image = Image.open(io.BytesIO(image_path_or_bytes)).convert("RGB")
            else:
                image = image_path_or_bytes
            
            # Transform image
            input_tensor = self.transform(image).unsqueeze(0).to(self.device)
            
            # Get predictions
            self.resnet.zero_grad()
            outputs = self.resnet(input_tensor)
            predicted_class = outputs.argmax(dim=1).item()
            
            # Generate GradCAM
            attributions = self.gradcam.attribute(
                input_tensor,
                target=predicted_class
            )
            
            # Upsample to image size
            cam = LayerAttribution.interpolate(
                attributions,
                input_tensor.shape[-2:]
            )
            
            cam = cam[0].detach().cpu().numpy()
            cam = np.maximum(cam, 0)
            cam = cam / (cam.max() + 1e-8)
            
            # Create visualizations
            orig_img = np.array(image.resize((224, 224))) / 255.0
            
            # Create heatmap using jet colormap (like in notebook)
            heatmap = plt.cm.jet(cam.squeeze())[..., :3]
            
            # Create overlay
            overlay = 0.6 * orig_img + 0.4 * heatmap
            overlay = np.clip(overlay, 0, 1)
            
            result = {
                'predicted_class': predicted_class,
                'original_shape': image.size,
            }
            
            if return_base64:
                # Convert to base64 for API response
                result['original_image'] = self._image_to_base64(orig_img)
                result['heatmap'] = self._image_to_base64(heatmap)
                result['overlay'] = self._image_to_base64(overlay.squeeze())
            else:
                result['original_image'] = orig_img
                result['heatmap'] = heatmap
                result['overlay'] = overlay
            
            return result
            
        except Exception as e:
            print(f"Error generating GradCAM: {e}")
            return {"error": str(e)}
    
    def analyze_medical_image(self, image_path_or_bytes):
        """
        Complete analysis: Caption + GradCAM for medical images
        
        Args:
            image_path_or_bytes: Path to image file or bytes
            
        Returns:
            dict: Contains caption and GradCAM visualization
        """
        caption = self.caption_image(image_path_or_bytes)
        gradcam_result = self.generate_gradcam(image_path_or_bytes)
        
        return {
            'caption': caption,
            'gradcam': gradcam_result
        }
    
    def _image_to_base64(self, img_array):
        """Convert numpy array image to base64 string"""
        try:
            # Ensure the array is in the correct format
            if img_array.ndim == 2:
                # Grayscale image (heatmap) - convert to RGB using jet colormap
                img_array = plt.cm.jet(img_array)[..., :3]
            
            # Squeeze any extra dimensions
            img_array = np.squeeze(img_array)
            
            # Convert to uint8
            img_array = (img_array * 255).astype(np.uint8)
            
            # Convert to PIL Image
            if img_array.ndim == 2:
                img = Image.fromarray(img_array, mode='L')
            else:
                img = Image.fromarray(img_array, mode='RGB')
            
            # Save to bytes buffer
            buffer = io.BytesIO()
            img.save(buffer, format='PNG')
            buffer.seek(0)
            
            # Encode to base64
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{img_base64}"
            
        except Exception as e:
            print(f"Error converting image to base64: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def process_image_for_rag(self, image_path):
        """
        Process image and return text description for RAG indexing
        Combines BLIP caption with basic image metadata
        
        Args:
            image_path: Path to image file
            
        Returns:
            str: Text description of the image
        """
        try:
            # Get caption
            caption = self.caption_image(image_path)
            
            # Get image metadata
            image = Image.open(image_path)
            width, height = image.size
            
            # Construct description
            description = f"Image Analysis:\n"
            description += f"Caption: {caption}\n"
            description += f"Dimensions: {width}x{height} pixels\n"
            description += f"Format: {image.format}\n"
            
            return description
            
        except Exception as e:
            return f"Error processing image: {str(e)}"
    
    def convert_dicom_to_png(self, dicom_file_path_or_bytes):
        """
        Convert DICOM file to PNG image
        
        Args:
            dicom_file_path_or_bytes: Path to DICOM file or bytes
            
        Returns:
            PIL Image: Converted PNG image
        """
        try:
            # Load DICOM file
            if isinstance(dicom_file_path_or_bytes, bytes):
                ds = pydicom.dcmread(io.BytesIO(dicom_file_path_or_bytes), force=True)
            else:
                ds = pydicom.dcmread(dicom_file_path_or_bytes, force=True)
            
            # If TransferSyntaxUID is missing, set default
            if not hasattr(ds.file_meta, "TransferSyntaxUID"):
                ds.file_meta.TransferSyntaxUID = ImplicitVRLittleEndian
            
            # Decode pixel data
            pixel_array = ds.pixel_array.astype(float)
            
            # Normalize to 0-255
            pixel_array = (pixel_array - pixel_array.min()) / (pixel_array.max() - pixel_array.min())
            pixel_array = (pixel_array * 255).astype(np.uint8)
            
            # Convert to PIL Image
            img = Image.fromarray(pixel_array)
            
            return img
            
        except Exception as e:
            print(f"Error converting DICOM to PNG: {e}")
            import traceback
            traceback.print_exc()
            return None
    
    def add_bounding_box(self, image, bbox_coords=None, color="yellow", width=3):
        """
        Add bounding box to image
        
        Args:
            image: PIL Image
            bbox_coords: Tuple (x1, y1, x2, y2), if None uses full image
            color: Box color
            width: Line width
            
        Returns:
            PIL Image: Image with bounding box
        """
        try:
            img = image.copy()
            draw = ImageDraw.Draw(img)
            
            # If no coordinates provided, use full image
            if bbox_coords is None:
                img_width, img_height = img.size
                bbox_coords = (0, 0, img_width - 1, img_height - 1)
            
            # Draw rectangle
            draw.rectangle(bbox_coords, outline=color, width=width)
            
            return img
            
        except Exception as e:
            print(f"Error adding bounding box: {e}")
            return image
    
    def process_dicom_with_analysis(self, dicom_file_path_or_bytes):
        """
        Complete DICOM processing: Convert to PNG, add bbox, generate caption + GradCAM
        
        Args:
            dicom_file_path_or_bytes: Path to DICOM file or bytes
            
        Returns:
            dict: Contains PNG image, bbox image, caption, and GradCAM results
        """
        try:
            # Convert DICOM to PNG
            png_image = self.convert_dicom_to_png(dicom_file_path_or_bytes)
            if png_image is None:
                return {"error": "Failed to convert DICOM to PNG"}
            
            # Add bounding box
            bbox_image = self.add_bounding_box(png_image)
            
            # Generate caption
            caption = self.caption_image(png_image)
            
            # Generate GradCAM
            gradcam_result = self.generate_gradcam(png_image)
            
            # Convert images to base64
            result = {
                'original_png': self._pil_image_to_base64(png_image),
                'bbox_image': self._pil_image_to_base64(bbox_image),
                'caption': caption,
                'gradcam': gradcam_result
            }
            
            return result
            
        except Exception as e:
            print(f"Error processing DICOM with analysis: {e}")
            import traceback
            traceback.print_exc()
            return {"error": str(e)}
    
    def _pil_image_to_base64(self, pil_image):
        """Convert PIL Image directly to base64"""
        try:
            buffer = io.BytesIO()
            pil_image.save(buffer, format='PNG')
            buffer.seek(0)
            img_base64 = base64.b64encode(buffer.getvalue()).decode('utf-8')
            return f"data:image/png;base64,{img_base64}"
        except Exception as e:
            print(f"Error converting PIL image to base64: {e}")
            return None


# Singleton instance
_vision_processor = None

def get_vision_processor():
    """Get or create vision processor singleton"""
    global _vision_processor
    if _vision_processor is None:
        _vision_processor = VisionProcessor()
    return _vision_processor
