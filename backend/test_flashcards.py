from processors.flashcard_service import FlashcardGenerator

print("Testing flashcard generation...")
fg = FlashcardGenerator()

text = """
Machine learning is a subset of artificial intelligence. 
Neural networks are computing systems inspired by biological neural networks. 
Deep learning uses multiple layers. Supervised learning uses labeled data.
"""

cards = fg.generate_flashcards(text, max_cards=3)
print(f"\n✅ Generated {len(cards)} flashcards\n")

for i, card in enumerate(cards, 1):
    print(f"Card {i}:")
    print(f"Q: {card['question']}")
    print(f"A: {card['answer']}")
    print()
