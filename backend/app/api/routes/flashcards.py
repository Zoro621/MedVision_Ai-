"""
Flashcard API routes — Phase 5+
"""
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models import ContentStatus, Flashcard, FlashcardDeck, FlashcardReview, FlashcardReviewEvent, User, UserRole
from app.schemas.learning import (
    FlashcardDeckDetailOut,
    FlashcardDeckOut,
    FlashcardGenerationRequest,
    FlashcardOut,
    FlashcardReviewRequest,
    FlashcardReviewResponse,
)
from app.services.adaptive_learning import (
    build_chat_session_scope,
    deck_matches_scope,
    generate_flashcards_for_chat,
    get_shown_flashcard_ids,
    mark_flashcards_shown,
    require_owned_chat_session,
)
from app.services.gamification import sync_user_gamification
from app.services.progress_state import record_learning_activity
from app.services.sm2 import initial_state, update_sm2, rating_label_to_int

router = APIRouter(prefix="/flashcards", tags=["flashcards"])

XP_PER_CARD = {"again": 2, "hard": 3, "good": 4, "easy": 5}


def _load_deck(db: Session, deck_id: str) -> FlashcardDeck:
    deck = db.scalars(
        select(FlashcardDeck)
        .where(FlashcardDeck.id == deck_id)
        .options(selectinload(FlashcardDeck.flashcards))
    ).first()
    if deck is None:
        raise HTTPException(status_code=404, detail="Deck not found.")
    return deck


def _resolve_chat_session_id(
    *,
    db: Session,
    user: User,
    deck: FlashcardDeck,
    chat_session_id: str | None,
) -> str | None:
    effective_chat_session_id = deck.chat_session_id or chat_session_id
    if effective_chat_session_id is None:
        return None

    if deck.chat_session_id and chat_session_id and deck.chat_session_id != chat_session_id:
        raise HTTPException(status_code=403, detail="Deck does not belong to this chat session.")

    if user.role != UserRole.ADMIN:
        require_owned_chat_session(db=db, user=user, chat_session_id=effective_chat_session_id)

    return effective_chat_session_id


def _ensure_deck_visible_to_user(
    *,
    db: Session,
    user: User,
    deck: FlashcardDeck,
    chat_session_id: str | None,
) -> str | None:
    effective_chat_session_id = _resolve_chat_session_id(
        db=db,
        user=user,
        deck=deck,
        chat_session_id=chat_session_id,
    )

    if user.role == UserRole.ADMIN:
        return effective_chat_session_id

    if deck.status != ContentStatus.PUBLISHED:
        raise HTTPException(status_code=403, detail="Deck not published.")

    if deck.chat_session_id:
        return effective_chat_session_id

    if not effective_chat_session_id:
        raise HTTPException(status_code=400, detail="chatSessionId is required for scoped flashcards.")

    scope = build_chat_session_scope(db=db, user=user, chat_session_id=effective_chat_session_id)
    if not deck_matches_scope(deck=deck, scope=scope):
        raise HTTPException(status_code=403, detail="Deck is outside the current chat scope.")

    return effective_chat_session_id


def _get_review(db: Session, user_id: str, chat_session_id: str, flashcard_id: str) -> FlashcardReview | None:
    return db.scalars(
        select(FlashcardReview).where(
            FlashcardReview.user_id == user_id,
            FlashcardReview.chat_session_id == chat_session_id,
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
        topic=card.topic,
        difficultyLevel=card.difficulty,
        sourceDocument=card.source_document,
        sourcePage=card.source_page,
        difficulty=review.last_rating if review and review.last_rating else "good",
        nextReviewDate=next_review_str,
        reviewCount=review.repetitions if review else 0,
    )


def _due_count(cards: list[Flashcard], reviews: dict[str, FlashcardReview], shown_ids: set[str]) -> int:
    today = datetime.now(timezone.utc)
    count = 0
    for card in cards:
        if card.id in shown_ids:
            continue
        review = reviews.get(card.id)
        if review is None or review.next_review_date <= today:
            count += 1
    return count


def _mastered_count(cards: list[Flashcard], reviews: dict[str, FlashcardReview]) -> int:
    return sum(
        1
        for card in cards
        if (review := reviews.get(card.id))
        and review.repetitions >= 3
        and review.last_rating in ("good", "easy")
    )


def _deck_to_out(
    deck: FlashcardDeck,
    cards: list[Flashcard],
    reviews: dict[str, FlashcardReview],
    shown_ids: set[str],
) -> FlashcardDeckOut:
    last_review_dates = [
        review.updated_at
        for review in reviews.values()
        if review.updated_at
    ]
    last_studied = None
    if last_review_dates:
        latest = max(last_review_dates)
        delta = (date.today() - latest.date()).days
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
        chatSessionId=deck.chat_session_id,
        documentId=deck.document_id,
        totalCards=len(cards),
        dueCards=_due_count(cards, reviews, shown_ids),
        masteredCards=_mastered_count(cards, reviews),
        lastStudied=last_studied,
    )


def _get_user_reviews_for_deck(
    db: Session,
    user_id: str,
    chat_session_id: str,
    cards: list[Flashcard],
) -> dict[str, FlashcardReview]:
    if not cards:
        return {}
    card_ids = [card.id for card in cards]
    reviews = db.scalars(
        select(FlashcardReview).where(
            FlashcardReview.user_id == user_id,
            FlashcardReview.chat_session_id == chat_session_id,
            FlashcardReview.flashcard_id.in_(card_ids),
        )
    ).all()
    return {review.flashcard_id: review for review in reviews}


@router.post("/generate", response_model=FlashcardDeckDetailOut)
def generate_flashcards(
    payload: FlashcardGenerationRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FlashcardDeckDetailOut:
    try:
        require_owned_chat_session(db=db, user=user, chat_session_id=payload.chat_session_id)
        deck = generate_flashcards_for_chat(
            db=db,
            user=user,
            chat_session_id=payload.chat_session_id,
            count=payload.count,
        )
        db.commit()
    except ValueError as exc:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except Exception as exc:
        db.rollback()
        raise HTTPException(status_code=502, detail=f"Flashcard generation failed: {exc}") from exc

    deck = _load_deck(db, deck.id)
    cards = sorted(deck.flashcards, key=lambda item: item.order_index)
    return FlashcardDeckDetailOut(
        id=deck.id,
        title=deck.title,
        topic=deck.topic,
        chatSessionId=deck.chat_session_id,
        documentId=deck.document_id,
        totalCards=len(cards),
        dueCards=len(cards),
        masteredCards=0,
        cards=[_card_to_out(card, None) for card in cards],
    )


@router.get("/decks", response_model=list[FlashcardDeckOut])
def list_decks(
    chat_session_id: str | None = Query(default=None, alias="chatSessionId"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FlashcardDeckOut]:
    if not chat_session_id and user.role != UserRole.ADMIN:
        return []

    scope = None
    if chat_session_id:
        scope = build_chat_session_scope(db=db, user=user, chat_session_id=chat_session_id)

    decks = db.scalars(
        select(FlashcardDeck)
        .where(FlashcardDeck.status == ContentStatus.PUBLISHED)
        .options(selectinload(FlashcardDeck.flashcards))
        .order_by(FlashcardDeck.created_at.desc())
    ).all()

    result: list[FlashcardDeckOut] = []
    shown_ids = get_shown_flashcard_ids(db=db, user_id=user.id, chat_session_id=chat_session_id) if chat_session_id else set()
    for deck in decks:
        if scope and not deck_matches_scope(deck=deck, scope=scope):
            continue
        reviews = (
            _get_user_reviews_for_deck(db, user.id, chat_session_id, deck.flashcards)
            if chat_session_id
            else {}
        )
        result.append(_deck_to_out(deck, deck.flashcards, reviews, shown_ids))
    return result


@router.get("/decks/{deck_id}", response_model=FlashcardDeckDetailOut)
def get_deck(
    deck_id: str,
    chat_session_id: str | None = Query(default=None, alias="chatSessionId"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FlashcardDeckDetailOut:
    deck = _load_deck(db, deck_id)
    effective_chat_session_id = _ensure_deck_visible_to_user(
        db=db,
        user=user,
        deck=deck,
        chat_session_id=chat_session_id,
    )

    cards = sorted(deck.flashcards, key=lambda card: card.order_index)
    reviews = (
        _get_user_reviews_for_deck(db, user.id, effective_chat_session_id, cards)
        if effective_chat_session_id
        else {}
    )
    shown_ids = (
        get_shown_flashcard_ids(db=db, user_id=user.id, chat_session_id=effective_chat_session_id)
        if effective_chat_session_id
        else set()
    )

    return FlashcardDeckDetailOut(
        id=deck.id,
        title=deck.title,
        topic=deck.topic,
        chatSessionId=deck.chat_session_id or effective_chat_session_id,
        documentId=deck.document_id,
        totalCards=len(cards),
        dueCards=_due_count(cards, reviews, shown_ids),
        masteredCards=_mastered_count(cards, reviews),
        cards=[_card_to_out(card, reviews.get(card.id)) for card in cards],
    )


@router.get("/decks/{deck_id}/due", response_model=list[FlashcardOut])
def get_due_cards(
    deck_id: str,
    chat_session_id: str | None = Query(default=None, alias="chatSessionId"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> list[FlashcardOut]:
    deck = _load_deck(db, deck_id)
    effective_chat_session_id = _ensure_deck_visible_to_user(
        db=db,
        user=user,
        deck=deck,
        chat_session_id=chat_session_id,
    )
    if effective_chat_session_id is None:
        raise HTTPException(status_code=400, detail="chatSessionId is required for scoped flashcards.")

    cards = sorted(deck.flashcards, key=lambda card: card.order_index)
    reviews = _get_user_reviews_for_deck(db, user.id, effective_chat_session_id, cards)
    shown_ids = get_shown_flashcard_ids(db=db, user_id=user.id, chat_session_id=effective_chat_session_id)
    now = datetime.now(timezone.utc)

    due_cards = []
    due_card_ids: list[str] = []
    for card in cards:
        if card.id in shown_ids:
            continue
        review = reviews.get(card.id)
        if review is None or review.next_review_date <= now:
            due_cards.append(_card_to_out(card, review))
            due_card_ids.append(card.id)

    mark_flashcards_shown(
        db=db,
        user_id=user.id,
        chat_session_id=effective_chat_session_id,
        flashcard_ids=due_card_ids,
    )
    db.commit()
    return due_cards


@router.post("/decks/{deck_id}/review", response_model=FlashcardReviewResponse)
def submit_review(
    deck_id: str,
    payload: FlashcardReviewRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
) -> FlashcardReviewResponse:
    deck = _load_deck(db, deck_id)
    effective_chat_session_id = _ensure_deck_visible_to_user(
        db=db,
        user=user,
        deck=deck,
        chat_session_id=payload.chat_session_id,
    )
    if effective_chat_session_id is None:
        raise HTTPException(status_code=400, detail="chatSessionId is required for scoped flashcards.")

    card = db.get(Flashcard, payload.cardId)
    if card is None or card.deck_id != deck_id:
        raise HTTPException(status_code=404, detail="Card not found in this deck.")

    rating_int = rating_label_to_int(payload.rating)
    review = _get_review(db, user.id, effective_chat_session_id, card.id)

    if review is None:
        state = initial_state()
        new_state = update_sm2(state, rating_int)
        review = FlashcardReview(
            user_id=user.id,
            chat_session_id=effective_chat_session_id,
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
            chat_session_id=effective_chat_session_id,
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
