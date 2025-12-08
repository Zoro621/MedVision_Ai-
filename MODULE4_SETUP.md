# Installation & Setup Instructions for Module 4

## Prerequisites
- Python 3.9+ with venv already created
- Node.js 18+ already installed
- Backend and frontend dependencies from previous modules

## Step 1: Install New Python Dependencies

### Option A: CPU Only (Slower)
```powershell
# Navigate to project root
cd C:\Users\emadh\OneDrive\Desktop\fyp_prototype

# Activate virtual environment
& .\venv\Scripts\Activate.ps1

# Install new dependencies for vision AI
cd backend
pip install captum==0.7.0
pip install matplotlib==3.8.0

# Verify transformers version (should already be installed)
pip install transformers==4.39.3 --upgrade
```

### Option B: GPU (NVIDIA CUDA) - RECOMMENDED for 3-5x Speed ⚡
```powershell
# Navigate to project root
cd C:\Users\emadh\OneDrive\Desktop\fyp_prototype

# Activate virtual environment
& .\venv\Scripts\Activate.ps1

# Uninstall CPU-only PyTorch first
cd backend
pip uninstall torch torchvision torchaudio -y

# Install PyTorch with CUDA 12.1 support (compatible with CUDA 13.0)
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121

# Install vision dependencies
pip install captum==0.7.0
pip install matplotlib==3.8.0
pip install transformers==4.39.3 --upgrade

# Verify CUDA is available
python -c "import torch; print(f'CUDA available: {torch.cuda.is_available()}'); print(f'CUDA device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else None}')"
```

## Step 2: Test Backend Installation

```powershell
# While still in backend directory with venv activated
python -c "import torch; from transformers import BlipProcessor; from captum.attr import LayerGradCam; print('✅ All vision dependencies installed successfully')"
```

## Step 3: Start the Backend Server

```powershell
# In backend directory
python main.py
```

You should see:
```
Vision Processor using device: cuda  # or cpu
 * Running on http://localhost:5000
```

## Step 4: Start the Frontend (New Terminal)

```powershell
# Open a new PowerShell terminal
cd C:\Users\emadh\OneDrive\Desktop\fyp_prototype

# Start Next.js development server
npm run dev
```

You should see:
```
✓ Ready on http://localhost:3000
```

## Step 5: Access the Vision Analysis Module

1. Open browser to `http://localhost:3000`
2. You should see a new "Vision Analysis" option in the sidebar (with Eye icon)
3. Click on "Vision Analysis"

## Step 6: Test the Vision Module

### Test 1: Upload an Image
1. Click the upload area
2. Select a medical image (or any image for testing)
3. You should see the image preview

### Test 2: Generate Caption
1. After uploading, click "Generate Caption (BLIP)"
2. Wait 2-5 seconds for processing
3. You should see the AI-generated caption

### Test 3: Full Analysis
1. Click "Full Analysis (Caption + GradCAM)"
2. Wait 3-7 seconds for processing
3. View the results in tabs:
   - **Caption tab**: AI-generated description
   - **GradCAM tab**: Three visualizations (original, heatmap, overlay)

## Step 7: Test Integration with Document Upload

### Enable BLIP in Document Processing:
The vision processor is now automatically integrated when you upload images through the "Upload Documents" section:

1. Go to "Upload Documents"
2. Upload an image file (JPG, PNG)
3. The system will now use BLIP to generate captions + OCR for text
4. Build the index as usual
5. When you chat, the AI can reference both the caption and OCR text

## Verification Checklist

- [ ] Backend starts without errors
- [ ] "Vision Analysis" appears in sidebar
- [ ] Can upload images successfully
- [ ] Caption generation works (2-5 seconds)
- [ ] GradCAM visualization displays correctly
- [ ] All three images shown (original, heatmap, overlay)
- [ ] No console errors in browser
- [ ] No Python errors in terminal

## Troubleshooting

### Error: "Module 'captum' not found"
```powershell
pip install captum==0.7.0
```

### Error: "CUDA out of memory"
- This is normal if you have a small GPU
- The system will automatically fall back to CPU
- Just wait a bit longer for processing

### Error: "Model download failed"
- Ensure you have internet connection
- Models download automatically on first use (~1.7GB total)
- Subsequent uses are instant

### Frontend shows "Backend not available"
- Ensure backend is running on port 5000
- Check for firewall blocking localhost connections
- Restart backend server

### Images not displaying in GradCAM
- Check browser console for errors
- Verify base64 image data is being returned
- Try with a different image format

## Testing with DICOM Files

The vision module works with DICOM files from `backend/uploads/`:

```powershell
# Test with existing DICOM file
cd backend
python -c "
from processors.vision_processor import get_vision_processor
vp = get_vision_processor()
result = vp.analyze_medical_image('uploads/20251101_114933_00000583_047.dcm')
print(result['caption'])
"
```

## Performance Notes

### First Run (Models Download):
- BLIP model: ~1GB download
- ResNet50: ~98MB download
- Total: ~1.1GB
- Time: 2-10 minutes depending on internet speed

### Subsequent Runs:
- Caption generation: 0.5-3 seconds
- GradCAM: 0.3-2 seconds
- Total analysis: 1-5 seconds

### GPU vs CPU:
- GPU (CUDA): 3-5x faster
- CPU: Still works, just slower
- System auto-detects and uses best option

## Next Steps

After successful installation:

1. **Test with your medical images**: Upload actual X-rays, CT scans, etc.
2. **Compare captions**: See how BLIP interprets different medical conditions
3. **Analyze GradCAM**: Understand what features the model focuses on
4. **Integrate with chat**: Upload images, build index, then ask questions
5. **Fine-tune prompts**: Experiment with different query styles in chat

## API Testing (Optional)

Test the backend API directly:

```powershell
# Test caption endpoint
curl -X POST http://localhost:5000/api/vision/caption `
  -F "file=@path\to\image.jpg"

# Test GradCAM endpoint
curl -X POST http://localhost:5000/api/vision/gradcam `
  -F "file=@path\to\image.jpg"

# Test full analysis
curl -X POST http://localhost:5000/api/vision/analyze `
  -F "file=@path\to\image.jpg"
```

## Module 4 Complete! ✅

You have successfully integrated:
- ✅ BLIP image captioning
- ✅ GradCAM explainability visualization
- ✅ Frontend UI for vision analysis
- ✅ Backend API endpoints
- ✅ Integration with RAG pipeline
- ✅ Enhanced document processing

Your MedVision system now supports:
1. Document upload (PDF, DOCX, images, DICOM)
2. Text extraction (OCR + BLIP)
3. Vector indexing (FAISS)
4. RAG chatbot (Gemini)
5. **Vision analysis (BLIP + GradCAM)** ← NEW!
6. Explainable AI visualizations ← NEW!
