# CLIP + GradCAM Integration Guide

## Overview
This document describes the integration of CLIP-based image captioning and GradCAM explainability visualization into the MedVision RAG pipeline.

## Module 4 Components

### 1. Vision Processor (`processors/vision_processor.py`)
- **BLIP Model**: Salesforce/blip-image-captioning-base for medical image captioning
- **ResNet50**: Pretrained model for feature extraction
- **GradCAM**: Gradient-weighted Class Activation Mapping for explainability
- **Features**:
  - Automatic image captioning
  - Visual attention heatmaps
  - Overlay visualizations
  - Integration with RAG text extraction

### 2. Backend API Endpoints
Three new endpoints added to `main.py`:

#### `/api/vision/caption` (POST)
Generate BLIP caption for an uploaded image.
```json
Request: multipart/form-data with 'file'
Response: {
  "caption": "a chest x-ray showing...",
  "filename": "image.jpg"
}
```

#### `/api/vision/gradcam` (POST)
Generate GradCAM visualization for an uploaded image.
```json
Request: multipart/form-data with 'file'
Response: {
  "filename": "image.jpg",
  "predicted_class": 153,
  "original_image": "data:image/png;base64,...",
  "heatmap": "data:image/png;base64,...",
  "overlay": "data:image/png;base64,..."
}
```

#### `/api/vision/analyze` (POST)
Complete analysis combining caption and GradCAM.
```json
Request: multipart/form-data with 'file'
Response: {
  "filename": "image.jpg",
  "caption": "a chest x-ray showing...",
  "gradcam": { ... }
}
```

### 3. Frontend Component (`frontend/components/vision-analysis.tsx`)
Interactive UI for vision analysis:
- Image upload with preview
- One-click caption generation
- GradCAM visualization display
- Tabbed interface for results
- Real-time processing feedback

### 4. Enhanced File Processor
Updated `file_processor.py` to:
- Optionally use BLIP captions during document indexing
- Combine OCR text with AI-generated descriptions
- Improve RAG context quality for medical images

## Usage Flow

### For Users:
1. Navigate to "Vision Analysis" from sidebar
2. Upload a medical image (JPG, PNG, DICOM)
3. Click "Generate Caption" for BLIP description
4. Click "Full Analysis" for Caption + GradCAM
5. View results in tabbed interface

### For RAG Integration:
When images are uploaded to the document pipeline:
1. BLIP generates semantic caption
2. EasyOCR extracts any text
3. Both are combined for FAISS indexing
4. Chat queries can retrieve visual context

## Technical Details

### Models Used:
- **BLIP**: 447M parameters, trained on 129M image-text pairs
- **ResNet50**: 25.6M parameters, ImageNet pretrained
- **GradCAM**: Post-hoc explainability technique

### Performance:
- Caption generation: ~2-3 seconds on CPU, ~0.5s on GPU
- GradCAM: ~1-2 seconds on CPU, ~0.3s on GPU
- Models loaded lazily to save memory

### Dependencies Added:
```
captum==0.7.0          # GradCAM implementation
matplotlib==3.8.0       # Visualization
transformers>=4.39.3    # BLIP model (already included)
torch                   # Deep learning (already included)
torchvision             # Image transforms (already included)
```

## Integration Points

### 1. Document Upload Flow
```
Image Upload → File Processor → BLIP Caption + OCR → Text Chunks → FAISS Index
```

### 2. Vision Analysis Flow
```
Image Upload → Vision Processor → [Caption, GradCAM] → Frontend Display
```

### 3. RAG Query Flow
```
User Question → FAISS Search → Retrieved Chunks (with image captions) → Gemini → Answer
```

## Future Enhancements (Beyond Module 4)

- [ ] Save GradCAM visualizations for later retrieval
- [ ] Integrate GradCAM into chat responses
- [ ] Support batch processing
- [ ] Add DICOM-specific visualization overlays
- [ ] Fine-tune BLIP on medical imaging dataset
- [ ] Add confidence scores to captions
- [ ] Export analysis reports (PDF)
- [ ] Real-time video frame analysis

## Configuration

### Enable/Disable BLIP in File Processing
In `file_processor.py`:
```python
file_processor = FileProcessor(use_vision_ai=True)  # Enable BLIP
file_processor = FileProcessor(use_vision_ai=False) # OCR only
```

### GPU Acceleration
The vision processor automatically detects and uses CUDA if available:
```python
device = "cuda" if torch.cuda.is_available() else "cpu"
```

## Testing

### Test Caption Generation:
```bash
curl -X POST http://localhost:5000/api/vision/caption \
  -F "file=@path/to/image.jpg"
```

### Test GradCAM:
```bash
curl -X POST http://localhost:5000/api/vision/gradcam \
  -F "file=@path/to/image.jpg"
```

### Test Full Analysis:
```bash
curl -X POST http://localhost:5000/api/vision/analyze \
  -F "file=@path/to/image.jpg"
```

## Troubleshooting

### Issue: Models taking too long to load
**Solution**: Models are loaded lazily on first use. Subsequent calls are faster.

### Issue: Out of memory errors
**Solution**: Reduce batch size or use CPU instead of GPU for larger images.

### Issue: Caption quality is poor
**Solution**: BLIP is trained on general images. Fine-tuning on medical images would improve results.

### Issue: GradCAM shows unexpected regions
**Solution**: GradCAM highlights regions that influence the ResNet50 classification. This may not align with medical interpretation.

## Credits

- **BLIP**: Li et al., "BLIP: Bootstrapping Language-Image Pre-training" (2022)
- **GradCAM**: Selvaraju et al., "Grad-CAM: Visual Explanations from Deep Networks" (2017)
- **Captum**: Facebook Research explainability library
