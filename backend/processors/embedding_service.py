import faiss
import numpy as np
import json
import os
from sentence_transformers import SentenceTransformer

class EmbeddingService:
    def __init__(self):
        self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        self.embedding_dim = 384
    
    def chunk_text(self, text, chunk_size=500, overlap=50):
        words = text.split()
        chunks = []
        
        for i in range(0, len(words), chunk_size - overlap):
            chunk = " ".join(words[i:i + chunk_size])
            if len(chunk.strip()) > 20:
                chunks.append(chunk.strip())
        
        return chunks
    
    def process_and_index_documents(self, upload_folder, index_path, metadata_path, file_processor):
        all_chunks = []
        all_metadata = []
        
        for filename in os.listdir(upload_folder):
            if filename.endswith("_anonymized.dcm"):
                continue
            
            file_path = os.path.join(upload_folder, filename)
            
            try:
                text = file_processor.process_file(file_path)
                chunks = self.chunk_text(text, chunk_size=500, overlap=50)
                
                for i, chunk in enumerate(chunks):
                    all_chunks.append(chunk)
                    all_metadata.append({
                        "chunk_text": chunk,
                        "source_file": filename,
                        "chunk_id": i,
                        "file_path": file_path
                    })
            except Exception as e:
                print(f"Error processing {filename}: {e}")
                continue
        
        if not all_chunks:
            raise ValueError("No text chunks extracted from documents")
        
        embeddings = self.embedding_model.encode(
            all_chunks,
            show_progress_bar=False,
            batch_size=128,
            convert_to_numpy=True,
            normalize_embeddings=True
        )
        
        index = faiss.IndexFlatIP(self.embedding_dim)
        index.add(embeddings)
        
        # Save index
        faiss.write_index(index, index_path)
        
        # Save metadata
        with open(metadata_path, 'w') as f:
            json.dump(all_metadata, f, indent=2)
        
        return {
            'total_chunks': len(all_chunks),
            'total_documents': len(set(m['source_file'] for m in all_metadata)),
            'index_path': index_path,
            'metadata_path': metadata_path
        }
