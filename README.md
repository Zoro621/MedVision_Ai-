# Document RAG Pipeline

An automated batch knowledge ingestion system that processes DICOM files, images, PDFs, and Word documents with advanced RAG (Retrieval-Augmented Generation) capabilities powered by FAISS embeddings and Google's Generative AI.

## Features

- **Multi-format Document Processing**
  - DICOM medical imaging with anonymization
  - PDF extraction with pdfplumber
  - Word documents (DOCX)
  - Image OCR with EasyOCR

- **Semantic Search & RAG**
  - FAISS vector indexing for fast similarity search
  - SentenceTransformers embeddings (all-MiniLM-L6-v2)
  - Intelligent fallback to direct API when context is insufficient
  - Citation of source documents

- **Modern Full-Stack Architecture**
  - Python Flask backend with modular processor services
  - React frontend with real-time chat interface
  - Clean separation of concerns
  - Docker-ready deployment

## Architecture

\`\`\`
frontend/                    # Next.js React application
├── app/                     # App router pages & layout
├── components/              # React components
└── package.json

backend/                     # Python Flask API
├── main.py                  # Flask application
├── processors/
│   ├── file_processor.py    # Multi-format file handling
│   ├── embedding_service.py # FAISS indexing
│   └── rag_service.py       # RAG with fallback
├── requirements.txt
└── run.sh
\`\`\`

## Quick Start

### Prerequisites

- Python 3.9+
- Node.js 18+
- Google Generative AI API Key (get it at https://aistudio.google.com/app/apikey)

### Backend Setup

\`\`\`bash
cd backend

# Create and activate virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Run the server
python main.py
\`\`\`

The backend will start on `http://localhost:5000`

### Frontend Setup

\`\`\`bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
\`\`\`

The frontend will open on `http://localhost:3000`

## Usage

1. **Upload Documents**: Go to "Upload Documents" and drag/drop or select files (PDF, DOCX, images, DICOM)
2. **Build Index**: Process documents and generate FAISS embeddings
3. **Chat**: Enter your Google API key and start asking questions about your documents
4. **Browse**: View all indexed documents and their metadata

## API Endpoints

### File Upload
- `POST /api/upload` - Upload document files

### Indexing
- `POST /api/index/build` - Build FAISS index from uploaded documents
- `GET /api/index/status` - Get current index status

### RAG & Search
- `POST /api/query` - Query with RAG + fallback
- `POST /api/search` - Semantic search without fallback
- `GET /api/documents` - List all indexed documents

## Configuration

Create a `.env` file in the backend directory:

\`\`\`
GOOGLE_API_KEY=your-api-key-here
FLASK_ENV=development
FLASK_DEBUG=1
UPLOAD_FOLDER=./uploads
FAISS_INDEX_PATH=./data/faiss_index.bin
METADATA_PATH=./data/metadata.json
\`\`\`

## File Format Support

| Format | Processing |
|--------|-----------|
| PDF | Text extraction with pdfplumber |
| DOCX | Paragraph extraction |
| JPG/PNG | OCR via EasyOCR |
| DICOM | Metadata + pixel OCR |

## Advanced Features

### DICOM Anonymization
The system automatically anonymizes DICOM files by removing sensitive metadata (PatientName, PatientID, StudyDate, etc.)

### Smart Fallback
If the RAG system doesn't find sufficient context (relevance score < 0.40), it automatically falls back to direct API queries while still being aware of your documents.

### Semantic Chunking
Documents are intelligently chunked with overlap to preserve context:
- Chunk size: 250 tokens
- Overlap: 50 tokens

## Performance Notes

- First index build may take 2-5 minutes depending on document volume
- FAISS uses CPU by default; can be modified for GPU acceleration
- Embedding model (all-MiniLM-L6-v2): 384 dimensions, fast inference

## Troubleshooting

**Backend not starting?**
- Ensure Python 3.9+ is installed
- Check if port 5000 is available
- Install all requirements: `pip install -r requirements.txt`

**Frontend can't connect to backend?**
- Ensure backend is running on `localhost:5000`
- Check browser console for CORS errors
- Verify Flask-CORS is installed

**OCR slow on images?**
- EasyOCR downloads models on first run
- For large batches, consider GPU acceleration

## Deployment

### Docker

\`\`\`dockerfile
# Backend Dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["python", "main.py"]
\`\`\`

### Environment Variables

For production, set:
- `FLASK_ENV=production`
- `GOOGLE_API_KEY` via secrets management
- `UPLOAD_FOLDER` to persistent storage

## License

MIT
