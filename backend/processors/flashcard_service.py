"""
Flashcard Generation Service
Generates educational flashcards from documents using spaCy + SentenceTransformers
"""

import spacy
from sentence_transformers import SentenceTransformer, util
from typing import List, Dict
import torch

class FlashcardGenerator:
    def __init__(self):
        """Initialize spaCy and SentenceTransformer models"""
        print("Loading flashcard generation models...")
        try:
            self.nlp = spacy.load("en_core_web_sm")
            print("✅ spaCy model loaded")
        except:
            print("❌ spaCy model not found. Run: python -m spacy download en_core_web_sm")
            self.nlp = None
        
        try:
            self.similarity_model = SentenceTransformer('sentence-transformers/all-MiniLM-L6-v2')
            print("✅ SentenceTransformer model loaded")
        except Exception as e:
            print(f"❌ SentenceTransformer model loading failed: {e}")
            self.similarity_model = None
    
    def extract_sentences(self, text: str) -> List[str]:
        """Extract meaningful sentences using spaCy"""
        if not self.nlp:
            return []
        
        doc = self.nlp(text)
        sentences = [sent.text.strip() for sent in doc.sents]
        # Filter sentences with at least 8 words
        return [s for s in sentences if len(s.split()) >= 8]
    
    def extract_key_info(self, sentence: str) -> Dict:
        """Extract entities and key phrases from a sentence"""
        if not self.nlp:
            return {'sentence': sentence, 'entities': [], 'concepts': []}
        
        doc = self.nlp(sentence)
        
        entities = [(ent.text, ent.label_) for ent in doc.ents]
        noun_chunks = [chunk.text for chunk in doc.noun_chunks if len(chunk.text.split()) >= 2]
        
        return {
            'sentence': sentence,
            'entities': entities,
            'concepts': noun_chunks
        }
    
    def generate_flashcards(self, text: str, max_cards: int = 10) -> List[Dict]:
        """
        Generate flashcards using local spaCy model
        Creates Q/A pairs based on entities and concepts
        
        Args:
            text: Source text to generate flashcards from
            max_cards: Maximum number of flashcards to generate
            
        Returns:
            List of flashcard dictionaries
        """
        if not self.nlp or not self.similarity_model:
            return []
        
        sentences = self.extract_sentences(text)
        flashcards = []
        
        for sentence in sentences[:max_cards * 2]:  # Process more to filter best
            info = self.extract_key_info(sentence)
            
            # Create flashcards from entities
            for entity, label in info['entities']:
                if label in ['PERSON', 'ORG', 'GPE', 'DATE', 'EVENT', 'DISEASE', 'CHEMICAL']:
                    question = sentence.replace(entity, "______")
                    flashcard = {
                        'question': f"Fill in the blank: {question}",
                        'answer': entity,
                        'context': sentence,
                        'type': 'entity',
                        'entity_label': label,
                        'confidence': 0.8
                    }
                    flashcards.append(flashcard)
            
            # Create definition-style flashcards from concepts
            if info['concepts']:
                main_concept = info['concepts'][0]
                flashcard = {
                    'question': f"What is {main_concept}?",
                    'answer': sentence,
                    'context': sentence,
                    'type': 'concept',
                    'entity_label': 'CONCEPT',
                    'confidence': 0.7
                }
                flashcards.append(flashcard)
        
        # Use MiniLM to rank by importance (diversity)
        if len(flashcards) > max_cards:
            embeddings = self.similarity_model.encode([f['context'] for f in flashcards])
            # Simple diversity sampling: pick distributed cards
            selected_indices = range(0, len(flashcards), len(flashcards) // max_cards)
            flashcards = [flashcards[i] for i in selected_indices][:max_cards]
        
        return flashcards
    
    def check_answer_similarity(self, user_answer: str, correct_answer: str, threshold: float = 0.65) -> Dict:
        """
        Check if user's answer is similar enough to the correct answer
        Uses multiple methods: exact match, fuzzy match, and semantic similarity
        
        Args:
            user_answer: User's submitted answer
            correct_answer: The correct answer
            threshold: Similarity threshold (0-1)
            
        Returns:
            Dict with is_correct flag and similarity score
        """
        user_lower = user_answer.lower().strip()
        correct_lower = correct_answer.lower().strip()
        
        # Method 1: Exact match (case-insensitive)
        if user_lower == correct_lower:
            return {'is_correct': True, 'score': 1.0, 'method': 'exact_match'}
        
        # Method 2: Check if answer is contained
        if user_lower in correct_lower or correct_lower in user_lower:
            shorter = min(len(user_lower), len(correct_lower))
            longer = max(len(user_lower), len(correct_lower))
            overlap_ratio = shorter / longer
            if overlap_ratio > 0.5:
                return {'is_correct': True, 'score': overlap_ratio, 'method': 'containment'}
        
        # Method 3: Fuzzy string matching
        fuzzy_score = self.fuzzy_match(user_lower, correct_lower)
        if fuzzy_score > threshold:
            return {'is_correct': True, 'score': fuzzy_score, 'method': 'fuzzy_match'}
        
        # Method 4: Semantic similarity using MiniLM
        if self.similarity_model:
            try:
                user_embedding = self.similarity_model.encode(user_answer, convert_to_tensor=True)
                correct_embedding = self.similarity_model.encode(correct_answer, convert_to_tensor=True)
                semantic_score = util.cos_sim(user_embedding, correct_embedding).item()
                
                if semantic_score > threshold:
                    return {'is_correct': True, 'score': semantic_score, 'method': 'semantic'}
                else:
                    return {'is_correct': False, 'score': semantic_score, 'method': 'semantic'}
            except:
                pass
        
        return {'is_correct': False, 'score': fuzzy_score, 'method': 'fuzzy_match'}
    
    def fuzzy_match(self, s1: str, s2: str) -> float:
        """
        Calculate similarity ratio between two strings
        Returns value between 0 and 1
        """
        words1 = set(s1.split())
        words2 = set(s2.split())
        
        if not words1 or not words2:
            return 0.0
        
        intersection = words1.intersection(words2)
        union = words1.union(words2)
        
        return len(intersection) / len(union) if union else 0.0


# Singleton instance
_flashcard_generator = None

def get_flashcard_generator():
    """Get or create flashcard generator singleton"""
    global _flashcard_generator
    if _flashcard_generator is None:
        _flashcard_generator = FlashcardGenerator()
    return _flashcard_generator
