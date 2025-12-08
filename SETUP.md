# Setup Guide

## System Requirements

- Python 3.9+
- Node.js 18+
- 4GB RAM minimum
- 2GB free disk space

## Installation Steps

### 1. Clone Repository

\`\`\`bash
git clone <repository-url>
cd doc-rag-pipeline
\`\`\`

### 2. Backend Setup

\`\`\`bash
cd backend

# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate
# Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p uploads data
\`\`\`

### 3. Frontend Setup

\`\`\`bash
cd ../frontend

# Install dependencies
npm install
\`\`\`

### 4. Get API Key

1. Visit https://aistudio.google.com/app/apikey
2. Sign in with your Google account
3. Create new API key
4. Copy the key

### 5. Start Services

**Terminal 1 - Backend:**
\`\`\`bash
cd backend
source venv/bin/activate
python main.py
\`\`\`

**Terminal 2 - Frontend:**
\`\`\`bash
cd frontend
npm run dev
\`\`\`

### 6. Access Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## Next Steps

1. Upload sample documents
2. Build the FAISS index
3. Enter your API key in the chat interface
4. Start querying your documents

## Troubleshooting

See README.md for common issues and solutions.
