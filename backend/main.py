from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
from werkzeug.utils import secure_filename
from datetime import datetime
import traceback
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Import processing modules
from processors.file_processor import FileProcessor
from processors.embedding_service import EmbeddingService
from processors.rag_service import RAGService
from processors.vision_processor import get_vision_processor
from processors.flashcard_service import get_flashcard_generator

app = Flask(__name__)
CORS(app)

# Configuration
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
FAISS_INDEX_PATH = os.path.join(os.getcwd(), 'data', 'faiss_index.bin')
METADATA_PATH = os.path.join(os.getcwd(), 'data', 'metadata.json')
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50MB
GOOGLE_API_KEY = os.getenv('GOOGLE_API_KEY', '')

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(os.path.dirname(FAISS_INDEX_PATH), exist_ok=True)

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# Initialize services
file_processor = FileProcessor()
embedding_service = EmbeddingService()
rag_service = RAGService(FAISS_INDEX_PATH, METADATA_PATH)
vision_processor = get_vision_processor()
flashcard_generator = get_flashcard_generator()

# Load existing index if available
try:
    rag_service.load_index()
    print("Loaded existing FAISS index")
except:
    print("No existing index found, will create new one on first upload")

ALLOWED_EXTENSIONS = {'pdf', 'docx', 'png', 'jpg', 'jpeg', 'dcm'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'service': 'Document RAG Pipeline'})

@app.route('/api/upload', methods=['POST'])
def upload_file():
    try:
        if 'files' not in request.files:
            return jsonify({'error': 'No files provided'}), 400
        
        files = request.files.getlist('files')
        results = []
        
        for file in files:
            if file.filename == '':
                continue
            
            if not allowed_file(file.filename):
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': 'File type not supported'
                })
                continue
            
            filename = secure_filename(file.filename)
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S_')
            filename = timestamp + filename
            
            filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
            file.save(filepath)
            
            # Process file
            try:
                extracted_text = file_processor.process_file(filepath)
                results.append({
                    'filename': file.filename,
                    'filepath': filename,
                    'success': True,
                    'text_preview': extracted_text[:200] + '...' if len(extracted_text) > 200 else extracted_text,
                    'text_length': len(extracted_text)
                })
            except Exception as e:
                results.append({
                    'filename': file.filename,
                    'success': False,
                    'error': str(e)
                })
        
        return jsonify({'files': results}), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/index/build', methods=['POST'])
def build_index():
    try:
        stats = embedding_service.process_and_index_documents(
            app.config['UPLOAD_FOLDER'],
            FAISS_INDEX_PATH,
            METADATA_PATH,
            file_processor
        )
        
        # Load the newly created index
        rag_service.load_index()
        
        return jsonify({
            'success': True,
            'stats': stats
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/index/status', methods=['GET'])
def index_status():
    try:
        status = {
            'has_index': rag_service.index is not None,
            'num_vectors': rag_service.index.ntotal if rag_service.index else 0,
            'num_documents': len(rag_service.metadata) if rag_service.metadata else 0
        }
        return jsonify(status), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/query', methods=['POST'])
def query_rag():
    try:
        data = request.json
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({'error': 'Query cannot be empty'}), 400
        
        api_key = GOOGLE_API_KEY
        if not api_key:
            return jsonify({'error': 'API key not configured. Please set GOOGLE_API_KEY environment variable.'}), 500
        
        answer, source_type, sources = rag_service.query_with_fallback(
            query, 
            api_key
        )
        
        # Don't expose source_type to users - only return answer and sources
        return jsonify({
            'answer': answer,
            'sources': sources
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/api/documents', methods=['GET'])
def list_documents():
    try:
        documents = []
        if rag_service.metadata:
            seen_files = set()
            for chunk in rag_service.metadata:
                filename = chunk.get('source_file')
                if filename not in seen_files:
                    seen_files.add(filename)
                    documents.append({
                        'filename': filename,
                        'file_path': chunk.get('file_path'),
                        'chunks': sum(1 for c in rag_service.metadata if c.get('source_file') == filename)
                    })
        
        return jsonify({'documents': documents}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search_documents():
    try:
        data = request.json
        query = data.get('query', '').strip()
        k = data.get('k', 5)
        
        if not query:
            return jsonify({'error': 'Query cannot be empty'}), 400
        
        if not rag_service.index:
            return jsonify({'error': 'No index available'}), 400
        
        results = rag_service.retrieve_relevant_chunks(query, k)
        
        return jsonify({
            'query': query,
            'results': results,
            'count': len(results)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/vision/caption', methods=['POST'])
def generate_caption():
    """Generate BLIP caption for an image"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read image bytes
        image_bytes = file.read()
        
        # Generate caption
        caption = vision_processor.caption_image(image_bytes)
        
        return jsonify({
            'caption': caption,
            'filename': file.filename
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/api/vision/gradcam', methods=['POST'])
def generate_gradcam_viz():
    """Generate GradCAM visualization for an image"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read image bytes
        image_bytes = file.read()
        
        # Generate GradCAM
        result = vision_processor.generate_gradcam(image_bytes, return_base64=True)
        
        if 'error' in result:
            return jsonify(result), 500
        
        return jsonify({
            'filename': file.filename,
            'predicted_class': result['predicted_class'],
            'original_image': result['original_image'],
            'heatmap': result['heatmap'],
            'overlay': result['overlay']
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/api/vision/analyze', methods=['POST'])
def analyze_medical_image():
    """Complete analysis: Caption + GradCAM for medical images"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read image bytes
        image_bytes = file.read()
        
        # Complete analysis
        result = vision_processor.analyze_medical_image(image_bytes)
        
        if 'error' in result.get('gradcam', {}):
            return jsonify({
                'caption': result['caption'],
                'error': result['gradcam']['error']
            }), 500
        
        return jsonify({
            'filename': file.filename,
            'caption': result['caption'],
            'gradcam': result['gradcam']
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/api/vision/dicom/convert', methods=['POST'])
def convert_dicom():
    """Convert DICOM to PNG with bounding box"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read DICOM file bytes
        dicom_bytes = file.read()
        
        # Convert to PNG
        png_image = vision_processor.convert_dicom_to_png(dicom_bytes)
        if png_image is None:
            return jsonify({'error': 'Failed to convert DICOM file'}), 500
        
        # Add bounding box
        bbox_image = vision_processor.add_bounding_box(png_image)
        
        # Convert to base64
        result = {
            'original_png': vision_processor._pil_image_to_base64(png_image),
            'bbox_image': vision_processor._pil_image_to_base64(bbox_image),
            'filename': file.filename.replace('.dcm', '.png')
        }
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/api/vision/dicom/analyze', methods=['POST'])
def analyze_dicom():
    """Complete DICOM analysis: Convert + Caption + GradCAM"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Read DICOM file bytes
        dicom_bytes = file.read()
        
        # Process DICOM with full analysis
        result = vision_processor.process_dicom_with_analysis(dicom_bytes)
        
        if 'error' in result:
            return jsonify(result), 500
        
        result['filename'] = file.filename
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/api/flashcards/generate', methods=['POST'])
def generate_flashcards():
    """Generate flashcards from document text"""
    try:
        data = request.json
        text = data.get('text', '')
        max_cards = data.get('max_cards', 10)
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400
        
        # Generate flashcards
        flashcards = flashcard_generator.generate_flashcards(text, max_cards=max_cards)
        
        return jsonify({
            'flashcards': flashcards,
            'count': len(flashcards)
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/api/flashcards/check-answer', methods=['POST'])
def check_flashcard_answer():
    """Check if user's flashcard answer is correct"""
    try:
        data = request.json
        user_answer = data.get('user_answer', '')
        correct_answer = data.get('correct_answer', '')
        threshold = data.get('threshold', 0.65)
        
        if not user_answer or not correct_answer:
            return jsonify({'error': 'Missing answer data'}), 400
        
        # Check answer similarity
        result = flashcard_generator.check_answer_similarity(
            user_answer, 
            correct_answer, 
            threshold
        )
        
        return jsonify(result), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

@app.route('/api/flashcards/generate-from-documents', methods=['POST'])
def generate_flashcards_from_documents():
    """Generate flashcards from indexed documents"""
    try:
        # Ensure index is loaded
        if not rag_service.metadata:
            rag_service.load_index()
        
        if not rag_service.metadata:
            return jsonify({'error': 'No documents found in index. Please upload and build index first.'}), 400
        
        # Combine all document texts from metadata (metadata is a list of chunks)
        combined_text = ""
        for chunk in rag_service.metadata:
            if 'chunk_text' in chunk:
                combined_text += chunk['chunk_text'] + "\n\n"
        
        if not combined_text:
            return jsonify({'error': 'No text content found in documents'}), 400
        
        # Generate flashcards
        max_cards = request.json.get('max_cards', 15) if request.json else 15
        flashcards = flashcard_generator.generate_flashcards(combined_text, max_cards=max_cards)
        
        if not flashcards:
            return jsonify({'error': 'Could not generate flashcards. Please ensure documents contain meaningful text.'}), 400
        
        return jsonify({
            'flashcards': flashcards,
            'count': len(flashcards),
            'source': 'indexed_documents'
        }), 200
    
    except Exception as e:
        return jsonify({'error': str(e), 'traceback': traceback.format_exc()}), 500

if __name__ == '__main__':
    app.run(debug=True, host='localhost', port=5000)

