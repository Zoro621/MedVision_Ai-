"""
Quick test script to verify RAG query and flashcard generation
"""
import os
import sys

# Add backend to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from processors.rag_service import RAGService
from processors.flashcard_service import get_flashcard_generator

# Paths
FAISS_INDEX_PATH = os.path.join(os.getcwd(), 'data', 'faiss_index.bin')
METADATA_PATH = os.path.join(os.getcwd(), 'data', 'metadata.json')

print("=" * 60)
print("Testing RAG Service and Flashcard Generation")
print("=" * 60)

# Test 1: Load index
print("\n1️⃣  Testing index loading...")
rag_service = RAGService(FAISS_INDEX_PATH, METADATA_PATH)
loaded = rag_service.load_index()

if loaded:
    print(f"✅ Index loaded successfully")
    print(f"   - Vectors: {rag_service.index.ntotal}")
    print(f"   - Metadata chunks: {len(rag_service.metadata)}")
else:
    print("❌ Failed to load index")
    sys.exit(1)

# Test 2: Query test
print("\n2️⃣  Testing query retrieval...")
test_query = "What is radiology?"
chunks = rag_service.retrieve_relevant_chunks(test_query, k=3)

if chunks:
    print(f"✅ Retrieved {len(chunks)} chunks")
    for i, chunk in enumerate(chunks, 1):
        print(f"   {i}. Score: {chunk['score']:.3f} | Source: {chunk['source_file'][:50]}")
else:
    print("❌ No chunks retrieved")

# Test 3: Flashcard generation
print("\n3️⃣  Testing flashcard generation from metadata...")
flashcard_gen = get_flashcard_generator()

# Combine text from first 5 chunks
combined_text = ""
for i, chunk in enumerate(rag_service.metadata[:5]):
    if 'chunk_text' in chunk:
        combined_text += chunk['chunk_text'] + "\n\n"

if combined_text:
    print(f"✅ Combined text length: {len(combined_text)} characters")
    flashcards = flashcard_gen.generate_flashcards(combined_text, max_cards=5)
    
    if flashcards:
        print(f"✅ Generated {len(flashcards)} flashcards")
        print("\n   Sample flashcard:")
        print(f"   Q: {flashcards[0]['question']}")
        print(f"   A: {flashcards[0]['answer'][:80]}...")
    else:
        print("❌ No flashcards generated")
else:
    print("❌ No text extracted from metadata")

print("\n" + "=" * 60)
print("Test completed!")
print("=" * 60)
