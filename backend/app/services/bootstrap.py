from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.database import Base, engine
from app.core.security import build_avatar_initials, hash_password
from app.models import (
    Badge, ContentStatus, DifficultyLevel, Flashcard, FlashcardDeck,
    Quiz, QuizQuestion, User, UserRole,
)
from app.services.storage import ensure_storage_root


DEFAULT_BADGES = [
    {
        "slug": "first-case-complete",
        "name": "First Case Complete",
        "description": "Completed your first guided radiology case.",
        "xp_reward": 50,
    },
    {
        "slug": "streak-starter",
        "name": "Streak Starter",
        "description": "Maintained your learning streak for three days.",
        "xp_reward": 100,
    },
]


def initialize_database() -> None:
    Base.metadata.create_all(bind=engine)
    _sync_phase_two_schema()
    _sync_phase_four_schema()
    _sync_phase_five_schema()
    ensure_storage_root()


def seed_defaults(
    db: Session,
    *,
    admin_email: str,
    admin_password: str,
    admin_full_name: str,
    admin_totp_secret: str,
) -> None:
    existing_admin = db.scalar(select(User).where(User.email == admin_email.lower()))
    if existing_admin is None:
        db.add(
            User(
                email=admin_email.lower(),
                password_hash=hash_password(admin_password),
                full_name=admin_full_name,
                role=UserRole.ADMIN,
                avatar_initials=build_avatar_initials(admin_full_name),
                totp_secret=admin_totp_secret,
                totp_enabled=True,
            )
        )

    existing_badges = {badge.slug for badge in db.scalars(select(Badge)).all()}
    for badge in DEFAULT_BADGES:
        if badge["slug"] not in existing_badges:
            db.add(Badge(**badge))

    db.commit()
    seed_learning_content(db)


def seed_learning_content(db: Session) -> None:
    """Seed sample quizzes and flashcard decks so students have content on first run."""
    admin = db.scalar(select(User).where(User.role == UserRole.ADMIN))
    admin_id = admin.id if admin else None

    # ── Quiz 1: Chest CT Findings ─────────────────────────────────────────
    if db.scalar(select(Quiz).where(Quiz.title == "Chest CT Findings")) is None:
        quiz = Quiz(
            title="Chest CT Findings",
            description="Test your knowledge of key CT patterns in chest radiology.",
            topic="Chest",
            status=ContentStatus.PUBLISHED,
            difficulty=DifficultyLevel.INTERMEDIATE,
            estimated_minutes=12,
            created_by_user_id=admin_id,
        )
        db.add(quiz)
        db.flush()
        for i, (prompt, options, correct, explanation, doc, page) in enumerate([
            (
                "A 45-year-old presents with acute dyspnoea. CT shows a filling defect in the right pulmonary artery. Most likely diagnosis?",
                [{"label": "A", "text": "Pneumonia"}, {"label": "B", "text": "Pulmonary Embolism"}, {"label": "C", "text": "Aortic Dissection"}, {"label": "D", "text": "Lung Cancer"}],
                "B", "Pulmonary embolism presents as a filling defect (hypodense area) within the pulmonary artery on CT angiography.",
                "Radiology_Textbook.pdf", 243,
            ),
            (
                "Which of the following is NOT a direct sign of pulmonary embolism on CTPA?",
                [{"label": "A", "text": "Intraluminal filling defect"}, {"label": "B", "text": "Hampton hump"}, {"label": "C", "text": "Railway track sign"}, {"label": "D", "text": "Complete vessel occlusion"}],
                "B", "Hampton hump is an INDIRECT sign — it represents pulmonary infarction as a wedge-shaped peripheral consolidation.",
                "Radiology_Textbook.pdf", 245,
            ),
            (
                "What RV:LV ratio on CT indicates right heart strain in PE?",
                [{"label": "A", "text": "> 0.5"}, {"label": "B", "text": "> 0.9"}, {"label": "C", "text": "> 1.0"}, {"label": "D", "text": "> 1.5"}],
                "C", "An RV:LV ratio > 1.0 indicates right ventricular dilatation, a sign of right heart strain.",
                "Radiology_Textbook.pdf", 246,
            ),
            (
                "The 'polo mint sign' on axial CTPA is characteristic of:",
                [{"label": "A", "text": "Complete vessel occlusion"}, {"label": "B", "text": "Partial filling defect with surrounding contrast"}, {"label": "C", "text": "Chronic thromboembolic disease"}, {"label": "D", "text": "Pulmonary artery aneurysm"}],
                "B", "The polo mint sign describes a partial filling defect surrounded by contrast material on axial images.",
                "Radiology_Textbook.pdf", 243,
            ),
            (
                "Which imaging modality is the gold standard for diagnosing acute PE?",
                [{"label": "A", "text": "Chest X-ray"}, {"label": "B", "text": "V/Q scan"}, {"label": "C", "text": "CT Pulmonary Angiography"}, {"label": "D", "text": "MR Angiography"}],
                "C", "CTPA is the gold standard for diagnosing acute PE with sensitivity 83-100% and specificity 89-97%.",
                "Radiology_Textbook.pdf", 242,
            ),
        ]):
            db.add(QuizQuestion(
                quiz_id=quiz.id,
                prompt=prompt,
                options_json=options,
                correct_answer=correct,
                explanation=explanation,
                source_document=doc,
                source_page=page,
                order_index=i,
            ))

    # ── Quiz 2: Neuro MRI Basics ──────────────────────────────────────────
    if db.scalar(select(Quiz).where(Quiz.title == "Neuro MRI Basics")) is None:
        quiz2 = Quiz(
            title="Neuro MRI Basics",
            description="Fundamental MRI sequences and findings in neuroradiology.",
            topic="Neuro",
            status=ContentStatus.PUBLISHED,
            difficulty=DifficultyLevel.BEGINNER,
            estimated_minutes=8,
            created_by_user_id=admin_id,
        )
        db.add(quiz2)
        db.flush()
        for i, (prompt, options, correct, explanation) in enumerate([
            (
                "Which MRI sequence is best for detecting acute ischaemic stroke?",
                [{"label": "A", "text": "T1W"}, {"label": "B", "text": "T2W"}, {"label": "C", "text": "DWI"}, {"label": "D", "text": "FLAIR"}],
                "C", "Diffusion-Weighted Imaging (DWI) shows restricted diffusion within minutes of acute stroke onset.",
            ),
            (
                "On T2-weighted MRI, CSF appears as:",
                [{"label": "A", "text": "Dark (hypointense)"}, {"label": "B", "text": "Bright (hyperintense)"}, {"label": "C", "text": "Intermediate signal"}, {"label": "D", "text": "Not visible"}],
                "B", "CSF has long T2 relaxation time, appearing bright (hyperintense) on T2-weighted sequences.",
            ),
            (
                "FLAIR suppresses signal from:",
                [{"label": "A", "text": "Fat"}, {"label": "B", "text": "Gadolinium"}, {"label": "C", "text": "Free water (CSF)"}, {"label": "D", "text": "Haemorrhage"}],
                "C", "FLAIR (Fluid Attenuated Inversion Recovery) nulls the signal from free water, making CSF dark while periventricular lesions remain bright.",
            ),
            (
                "Which sequence best demonstrates myelination in paediatric brain MRI?",
                [{"label": "A", "text": "T1W"}, {"label": "B", "text": "DWI"}, {"label": "C", "text": "SWI"}, {"label": "D", "text": "MRA"}],
                "A", "T1-weighted sequences best show myelination as the myelin sheath contains lipids with short T1 relaxation times, appearing bright.",
            ),
        ]):
            db.add(QuizQuestion(
                quiz_id=quiz2.id,
                prompt=prompt,
                options_json=options,
                correct_answer=correct,
                explanation=explanation,
                order_index=i,
            ))

    # ── Flashcard Deck 1: Pulmonary Embolism ──────────────────────────────
    if db.scalar(select(FlashcardDeck).where(FlashcardDeck.title == "Pulmonary Embolism")) is None:
        deck1 = FlashcardDeck(
            title="Pulmonary Embolism",
            description="Key CT signs and clinical context for PE.",
            topic="Chest",
            status=ContentStatus.PUBLISHED,
            created_by_user_id=admin_id,
        )
        db.add(deck1)
        db.flush()
        for i, (front, back, doc, page) in enumerate([
            (
                "What is the 'polo mint sign' in CT pulmonary angiography?",
                "The polo mint sign refers to a partial filling defect within the pulmonary artery on axial CT — the thrombus appears as a low-density ring surrounded by contrast-enhanced blood.",
                "Radiology_Textbook.pdf", 243,
            ),
            (
                "What are the direct signs of pulmonary embolism on CTPA?",
                "1. Intraluminal filling defect (partial or complete occlusion)\n2. Polo mint sign (axial view)\n3. Railway track sign (longitudinal view)\n4. Vessel cutoff with distal oligemia",
                "Radiology_Textbook.pdf", 244,
            ),
            (
                "What are the indirect signs of pulmonary embolism?",
                "1. Wedge-shaped peripheral consolidation (Hampton hump)\n2. Mosaic attenuation pattern\n3. Pleural effusion\n4. Right heart strain (RV:LV ratio > 1)\n5. Pulmonary infarction",
                "Radiology_Textbook.pdf", 245,
            ),
            (
                "What is the sensitivity and specificity of CTPA for PE diagnosis?",
                "CTPA has a sensitivity of 83–100% and specificity of 89–97% for detecting pulmonary embolism. It is the gold standard imaging modality for PE diagnosis.",
                "Radiology_Textbook.pdf", 242,
            ),
        ]):
            db.add(Flashcard(
                deck_id=deck1.id,
                front_text=front,
                back_text=back,
                source_document=doc,
                source_page=page,
                order_index=i,
            ))

    # ── Flashcard Deck 2: Brain MRI Anatomy ───────────────────────────────
    if db.scalar(select(FlashcardDeck).where(FlashcardDeck.title == "Brain MRI Anatomy")) is None:
        deck2 = FlashcardDeck(
            title="Brain MRI Anatomy",
            description="MRI sequences and brain anatomy essentials.",
            topic="Neuro",
            status=ContentStatus.PUBLISHED,
            created_by_user_id=admin_id,
        )
        db.add(deck2)
        db.flush()
        for i, (front, back) in enumerate([
            ("What does DWI show in acute stroke?", "Restricted diffusion — bright signal on DWI (b1000) with corresponding dark ADC map — within minutes of ischaemia onset."),
            ("What is the ADC map?", "Apparent Diffusion Coefficient map — confirms restricted diffusion. Acute stroke appears dark on ADC (low diffusion), distinguishing it from T2 shine-through."),
            ("What is T2 shine-through?", "Bright DWI signal due to long T2 relaxation (not restricted diffusion). ADC is normal or high, distinguishing it from true restricted diffusion."),
            ("What structures are best seen on FLAIR?", "Periventricular lesions (e.g. MS plaques), cortical contusions, subarachnoid haemorrhage — anything adjacent to CSF spaces."),
        ]):
            db.add(Flashcard(
                deck_id=deck2.id,
                front_text=front,
                back_text=back,
                order_index=i,
            ))

    db.commit()


def _sync_phase_two_schema() -> None:
    statements = [
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS mime_type VARCHAR(128)",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS kind VARCHAR(32)",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS file_size_bytes INTEGER",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS checksum_sha256 VARCHAR(64)",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS page_count INTEGER",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS chunk_count INTEGER DEFAULT 0",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS extraction_engine VARCHAR(64)",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS extracted_text TEXT",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS ingestion_error TEXT",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS is_shared BOOLEAN DEFAULT FALSE",
        "ALTER TABLE documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
        "UPDATE documents SET kind = COALESCE(kind, LOWER(file_type), 'pdf')",
        "UPDATE documents SET chunk_count = COALESCE(chunk_count, 0)",
        "UPDATE documents SET is_shared = COALESCE(is_shared, FALSE)",
    ]

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _sync_phase_four_schema() -> None:
    # Keep vision metadata in citation_metadata JSON so we avoid large migrations.
    # This function exists to preserve the "ALTER IF NOT EXISTS" pattern as we evolve.
    statements: list[str] = []
    if not statements:
        return

    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))


def _sync_phase_five_schema() -> None:
    """Safely add Phase 5 columns to existing tables that were created before this phase."""
    statements = [
        "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS topic VARCHAR(128)",
        "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS estimated_minutes INTEGER DEFAULT 10",
        "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
        "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS chat_session_id VARCHAR(36) REFERENCES chat_sessions(id) ON DELETE SET NULL",
        "ALTER TABLE quizzes ADD COLUMN IF NOT EXISTS document_id VARCHAR(36) REFERENCES documents(id) ON DELETE SET NULL",
        "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS options_json JSON",
        "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS correct_answer VARCHAR(8)",
        "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS chat_session_id VARCHAR(36) REFERENCES chat_sessions(id) ON DELETE SET NULL",
        "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS topic VARCHAR(128)",
        "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS difficulty INTEGER",
        "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS source_document VARCHAR(255)",
        "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS source_page INTEGER",
        "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS irt_discrimination DOUBLE PRECISION",
        "ALTER TABLE quiz_questions ADD COLUMN IF NOT EXISTS irt_guessing DOUBLE PRECISION",
        "ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS topic VARCHAR(128)",
        "ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
        "ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS chat_session_id VARCHAR(36) REFERENCES chat_sessions(id) ON DELETE SET NULL",
        "ALTER TABLE flashcard_decks ADD COLUMN IF NOT EXISTS document_id VARCHAR(36) REFERENCES documents(id) ON DELETE SET NULL",
        "ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS chat_session_id VARCHAR(36) REFERENCES chat_sessions(id) ON DELETE SET NULL",
        "ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS topic VARCHAR(128)",
        "ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS difficulty INTEGER",
        "ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS source_document VARCHAR(255)",
        "ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS source_page INTEGER",
        "ALTER TABLE flashcards ADD COLUMN IF NOT EXISTS order_index INTEGER DEFAULT 0",
        "ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS chat_session_id VARCHAR(36) REFERENCES chat_sessions(id) ON DELETE SET NULL",
        "ALTER TABLE quiz_attempts ADD COLUMN IF NOT EXISTS wrong_topics_json JSON",
        "ALTER TABLE flashcard_reviews ADD COLUMN IF NOT EXISTS chat_session_id VARCHAR(36) REFERENCES chat_sessions(id) ON DELETE SET NULL",
        "ALTER TABLE flashcard_review_events ADD COLUMN IF NOT EXISTS chat_session_id VARCHAR(36) REFERENCES chat_sessions(id) ON DELETE SET NULL",
        "UPDATE quiz_questions SET topic = COALESCE(quiz_questions.topic, quizzes.topic) FROM quizzes WHERE quiz_questions.quiz_id = quizzes.id",
        "UPDATE flashcards SET topic = COALESCE(flashcards.topic, flashcard_decks.topic) FROM flashcard_decks WHERE flashcards.deck_id = flashcard_decks.id",
        "CREATE INDEX IF NOT EXISTS ix_quizzes_chat_session_id ON quizzes(chat_session_id)",
        "CREATE INDEX IF NOT EXISTS ix_quizzes_document_id ON quizzes(document_id)",
        "CREATE INDEX IF NOT EXISTS ix_quiz_questions_chat_session_id ON quiz_questions(chat_session_id)",
        "CREATE INDEX IF NOT EXISTS ix_quiz_questions_topic ON quiz_questions(topic)",
        "CREATE INDEX IF NOT EXISTS ix_flashcard_decks_chat_session_id ON flashcard_decks(chat_session_id)",
        "CREATE INDEX IF NOT EXISTS ix_flashcard_decks_document_id ON flashcard_decks(document_id)",
        "CREATE INDEX IF NOT EXISTS ix_flashcards_chat_session_id ON flashcards(chat_session_id)",
        "CREATE INDEX IF NOT EXISTS ix_flashcards_topic ON flashcards(topic)",
        "CREATE INDEX IF NOT EXISTS ix_quiz_attempts_chat_session_id ON quiz_attempts(chat_session_id)",
        "CREATE INDEX IF NOT EXISTS ix_flashcard_reviews_chat_session_id ON flashcard_reviews(chat_session_id)",
        "CREATE INDEX IF NOT EXISTS ix_flashcard_review_events_chat_session_id ON flashcard_review_events(chat_session_id)",
        "ALTER TABLE flashcard_reviews DROP CONSTRAINT IF EXISTS uq_user_flashcard",
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1
                FROM pg_constraint
                WHERE conname = 'uq_user_chat_flashcard'
            ) THEN
                ALTER TABLE flashcard_reviews
                ADD CONSTRAINT uq_user_chat_flashcard
                UNIQUE (user_id, chat_session_id, flashcard_id);
            END IF;
        END $$;
        """,
    ]
    with engine.begin() as connection:
        for statement in statements:
            connection.execute(text(statement))
