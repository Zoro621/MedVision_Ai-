import faiss
import json
import os
from sentence_transformers import SentenceTransformer
import google.generativeai as genai

class RAGService:
    def __init__(self, index_path, metadata_path):
        self.index_path = index_path
        self.metadata_path = metadata_path
        self.index = None
        self.metadata = None
        self.embedding_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
        
        self.RAG_SYSTEM_PROMPT = """
You are an expert assistant. Answer the student's question using ONLY the provided context.

CONTEXT:
{context}

RULES:
- Be concise and educational
- Cite sources when possible (mention file names)
- If context doesn't contain sufficient information, respond with exactly: "INSUFFICIENT_CONTEXT"
"""
        
        self.FALLBACK_SYSTEM_PROMPT = """
You are an expert assistant answering questions comprehensively.
- Be concise, accurate, and relevant.
- If unsure, say "I cannot determine without more information".
"""
    
    def load_index(self):
        if os.path.exists(self.index_path) and os.path.exists(self.metadata_path):
            self.index = faiss.read_index(self.index_path)
            with open(self.metadata_path, 'r') as f:
                self.metadata = json.load(f)
            return True
        return False
    
    def retrieve_relevant_chunks(self, query, k=5):
        if not self.index or not self.metadata:
            print("⚠️  Index or metadata not loaded")
            return []
        
        query_embedding = self.embedding_model.encode([query], convert_to_numpy=True, normalize_embeddings=True)
        
        scores, indices = self.index.search(query_embedding, k)
        
        print(f"📊 Query: '{query[:50]}...'")
        print(f"📊 Top {k} similarity scores: {scores[0]}")
        
        results = []
        for score, idx in zip(scores[0], indices[0]):
            if idx < len(self.metadata):
                result = self.metadata[idx].copy()
                result['score'] = float(score)
                results.append(result)
        
        return results
    
    def query_with_fallback(self, query, api_key):
        genai.configure(api_key=api_key)
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        try:
            relevant_chunks = self.retrieve_relevant_chunks(query, k=5)
            
            if relevant_chunks and relevant_chunks[0]['score'] > 0.40:
                print(f"✅ Using RAG mode (top score: {relevant_chunks[0]['score']:.3f})")
                context = "\n\n---\n\n".join([
                    f"**Source: {chunk['source_file']}**\n{chunk['chunk_text']}"
                    for chunk in relevant_chunks
                ])
                
                rag_prompt = self.RAG_SYSTEM_PROMPT.format(context=context)
                full_prompt = f"{rag_prompt}\n\nQuestion: {query}\n\nAnswer:"
                
                response = model.generate_content(full_prompt)
                answer = response.text.strip()
                
                if "INSUFFICIENT_CONTEXT" in answer:
                    print("⚠️  Model indicated insufficient context, falling back to direct API")
                    return self._ask_direct_api(query, model), "API (Fallback)", []
                
                sources = [
                    {
                        'source_file': chunk['source_file'],
                        'relevance': chunk['score']
                    }
                    for chunk in relevant_chunks
                ]
                
                return answer, "RAG", sources
            else:
                top_score = relevant_chunks[0]['score'] if relevant_chunks else 0
                print(f"⚠️  Low relevance score ({top_score:.3f}), using direct API instead")
                return self._ask_direct_api(query, model), "API (Low Relevance)", []
        
        except NameError:
            print("⚠️  Index not loaded, using direct API")
            return self._ask_direct_api(query, model), "API (No Index)", []
        except Exception as e:
            print(f"❌ Error in query_with_fallback: {str(e)}")
            return self._ask_direct_api(query, model), f"API (Error)", []
    
    def _ask_direct_api(self, query, model):
        full_prompt = f"{self.FALLBACK_SYSTEM_PROMPT}\n\nUser: {query}\n\nAssistant:"
        try:
            response = model.generate_content(full_prompt)
            return response.text.strip()
        except Exception as e:
            return f"Error: {str(e)}"
