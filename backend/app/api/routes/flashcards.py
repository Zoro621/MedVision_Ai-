"""
Flashcard API routes — Phase 5 (SM-2 spaced repetition)
"""
from datetime import datetime, date, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import (
    ContentStatus,
    Flashcard,
    FlashcardDeck,
    FlashcardReview,
    FlashcardReviewEvent,
    User,
)
from app.schemas.learning import (
    FlashcardDeckDetailOut,
    FlashcardDeckOut,
    FlashcardOut,
    FlashcardReviewRequest,
    FlashcardReviewResponse,
)
from app.services.sm2 import initial_state, update_sm2, rating_label_to_int
from app.services.progress_state import record_learning_activity
from app.services.gamification import sync_user_gamification

router = APIRouter(prefix="/flashcards", tags=["flashcards"])

XP_PER_CARD = {"again": 2, "hard": 3, "good": 4, "easy": 5}


def _get_review(db: Session, user_id: str, flashcard_id: str) -> FlashcardReview | None:
    return db.scalars(
        select(FlashcardReview).where(
            FlashcardReview.user_id == user_id,
            FlashcardReview.flashcard_id == flashcard_id,
        )
    ).first()


def _card_to_out(card: Flashcard, review: FlashcardReview | None) -> FlashcardOut:
    next_review_str = None
    if review and review.next_review_date:
        next_review_str = review.next_review_date.replace(tzinfo=timezone.utc).isoformat()
    return FlashcardOut(
        id=card.id,
        deckId=card.deck_id,
        front=card.front_text,
        back=card.back_text,
        sourceDocument=card.source_document,
        sourcePage=card.source_page,
        difficulty=review.last_rating if review and review.last_rating else "good",
        nextReviewDate=next_review_str,
        reviewCount=review.repetitions if review else 0,
    )


def _due_count(cards: list[Flashcard], reviews: dict[str, FlashcardReview]) -> int:
    today = datetime.now(timezone.utc)
    count = 0
    for card in cards:
        rev = reviews.get(card.id)
        if rev is None or rev.next_review_date <= today:
            count += 1
    return count


def _mastered_count(cards: list[Flashcard], reviews: dict[str, FlashcardReview]) -> int:
    return sum(
        1 for card in cards
        if (rev := reviews.get(card.id)) and rev.repetitions >= 3 and rev.last_rating in ("good", "easy")
    )


def _deck_to_out(
    deck: FlashcardDeck,
    cards: list[Flashcard],
    reviews: dict[str, FlashcardReview],
) -> FlashcardDeckOut:
    # last studied = most recent review update
    last_review_dates = [
        r.updated_at for cid, r in reviews.items()
        if any(c.id == cid for c in cards) and r.updated_at
    ]
    last_studied = None
    if last_review_dates:
        latest = max(last_review_dates)
        today = date.today()
        delta = (today - latest.date()).days
        if delta == 0:
            last_studied = "today"
        elif delta == 1:
            last_studied = "yesterday"
        else:
            last_studied = f"{delta} days ago"

    return FlashcardDeckOut(
        id=deck.id,
        title=deck.title,
        topic=deck.topic,
        totalCards=len(cards),
        dueCards=_due_count(cards, reviews),
        masteredCards=_mastered_count(cards, reviews),
        lastStudied=last_studied,
    )


def _get_user_reviews_for_deck(
    db: Session, user_id: str, cards: list[Flashcard]
) -> dict[str, FlashcardReview]:
    if not cards:
        return {}
    card_ids = [c.id for c in cards]
    revs = db.scalars(
        select(FlashcardReview).where(
            FlashcardReview.user_id == user_id,
            FlashcardReview.flashcard_id.in_(card_ids),
        )
    ).all()
    return {r.flashcard_id: r for r in revs}


@router.get("/decks", response_model=list[FlashcardDeckOut])
def list_decks(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FlashcardDeckOut]:
    decks = db.scalars(
        select(FlashcardDeck)
        .where(FlashcardDeck.status == ContentStatus.PUBLISHED)
        .options(selectinload(FlashcardDeck.flashcards))
        .order_by(FlashcardDeck.created_at.desc())
    ).all()

    result = []
    for deck in decks:
        reviews = _get_user_reviews_for_deck(db, user.id, deck.flashcards)
        result.append(_deck_to_out(deck, deck.flashcards, reviews))
    return result


@router.get("/decks/{deck_id}", response_model=FlashcardDeckDetailOut)
def get_deck(
    deck_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FlashcardDeckDetailOut:
    deck = db.scalars(
        select(FlashcardDeck)
        .where(FlashcardDeck.id == deck_id)
        .options(selectinload(FlashcardDeck.flashcards))
    ).first()

    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found.")
    if deck.status != ContentStatus.PUBLISHED:
        raise HTTPException(status_code=403, detail="Deck not published.")

    cards = sorted(deck.flashcards, key=lambda c: c.order_index)
    reviews = _get_user_reviews_for_deck(db, user.id, cards)

    return FlashcardDeckDetailOut(
        id=deck.id,
        title=deck.title,
        topic=deck.topic,
        totalCards=len(cards),
        dueCards=_due_count(cards, reviews),
        masteredCards=_mastered_count(cards, reviews),
        cards=[_card_to_out(c, reviews.get(c.id)) for c in cards],
    )


@router.get("/decks/{deck_id}/due", response_model=list[FlashcardOut])
def get_due_cards(
    deck_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FlashcardOut]:
    """Return cards due for review today (SM-2 schedule)."""
    deck = db.scalars(
        select(FlashcardDeck)
        .where(FlashcardDeck.id == deck_id)
        .options(selectinload(FlashcardDeck.flashcards))
    ).first()

    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found.")

    cards = sorted(deck.flashcards, key=lambda c: c.order_index)
    reviews = _get_user_reviews_for_deck(db, user.id, cards)
    now = datetime.now(timezone.utc)

    due = []
    for card in cards:
        rev = reviews.get(card.id)
        if rev is None or rev.next_review_date <= now:
            due.append(_card_to_out(card, rev))

    return due


@router.post("/decks/{deck_id}/review", response_model=FlashcardReviewResponse)
def submit_review(
    deck_id: str,
    payload: FlashcardReviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FlashcardReviewResponse:
    """Submit SM-2 rating for a single card."""
    card = db.get(Flashcard, payload.cardId)
    if card is None or card.deck_id != deck_id:
        raise HTTPException(status_code=404, detail="Card not found in this deck.")

    rating_int = rating_label_to_int(payload.rating)
    review = _get_review(db, user.id, card.id)

    if review is None:
        state = initial_state()
        new_state = update_sm2(state, rating_int)
        review = FlashcardReview(
            user_id=user.id,
            flashcard_id=card.id,
            ease_factor=new_state.ease_factor,
            interval_days=new_state.interval,
            repetitions=new_state.repetitions,
            last_rating=payload.rating,
            next_review_date=datetime.combine(
                new_state.next_review_date, datetime.min.time()
            ).replace(tzinfo=timezone.utc),
        )
        db.add(review)
    else:
        from app.services.sm2 import SM2State
        state = SM2State(
            ease_factor=review.ease_factor,
            interval=review.interval_days,
            repetitions=review.repetitions,
            next_review_date=review.next_review_date.date(),
        )
        new_state = update_sm2(state, rating_int)
        review.ease_factor = new_state.ease_factor
        review.interval_days = new_state.interval
        review.repetitions = new_state.repetitions
        review.last_rating = payload.rating
        review.next_review_date = datetime.combine(
            new_state.next_review_date, datetime.min.time()
        ).replace(tzinfo=timezone.utc)

    xp = XP_PER_CARD.get(payload.rating, 3)
    db.add(
        FlashcardReviewEvent(
            user_id=user.id,
            flashcard_id=card.id,
            deck_id=deck_id,
            rating=payload.rating,
            interval_days=review.interval_days,
            ease_factor=review.ease_factor,
            repetitions=review.repetitions,
            xp_earned=xp,
        )
    )
    record_learning_activity(db=db, user_id=user.id, xp_earned=xp)
    sync_user_gamification(db, user.id)

    db.commit()

    return FlashcardReviewResponse(
        cardId=card.id,
        rating=payload.rating,
        nextReviewDate=review.next_review_date.isoformat(),
        intervalDays=review.interval_days,
        easeFactor=review.ease_factor,
        xpEarned=xp,
    )
