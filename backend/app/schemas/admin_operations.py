from pydantic import BaseModel


class AdminStudentRowOut(BaseModel):
    id: str
    name: str
    email: str
    level: int
    levelTitle: str
    avgScore: int
    streak: int
    xp: int
    status: str
    risk: str
    avatarInitials: str
    joinedAt: str | None = None
    radiologyFocus: list[str] = []
    totalStudyTime: int = 0
    quizzesTaken: int = 0
    lastActive: str | None = None


class StudentTopicMasteryOut(BaseModel):
    topic: str
    mastery: int


class StudentActivityItemOut(BaseModel):
    id: str
    occurredAt: str
    action: str
    detail: str | None = None
    icon: str


class StudentQuizAttemptOut(BaseModel):
    id: str
    quizTitle: str
    date: str
    score: int
    timeMinutes: int
    xpEarned: int
    status: str


class StudentFlashcardDeckActivityOut(BaseModel):
    deckTitle: str
    topic: str
    reviews: int
    xpEarned: int
    lastReviewedAt: str | None = None


class StudentScorePointOut(BaseModel):
    date: str
    score: int


class AdminStudentDetailOut(BaseModel):
    student: AdminStudentRowOut
    topicMastery: list[StudentTopicMasteryOut]
    activity: list[StudentActivityItemOut]
    quizAttempts: list[StudentQuizAttemptOut]
    flashcardActivity: list[StudentFlashcardDeckActivityOut]
    scoreHistory: list[StudentScorePointOut]
    recommendations: list[str]
    badges: list[str]


class AuditActorOut(BaseModel):
    id: str | None = None
    name: str
    role: str


class AuditTargetOut(BaseModel):
    type: str
    id: str | None = None
    name: str | None = None


class AuditLogItemOut(BaseModel):
    id: str
    timestamp: str
    actor: AuditActorOut
    action: str
    category: str
    severity: str
    target: AuditTargetOut | None = None
    details: dict = {}
    success: bool = True


class SystemServiceOut(BaseModel):
    name: str
    status: str
    detail: str
    metric: str | None = None


class SystemMetricOut(BaseModel):
    label: str
    value: str
    description: str


class SystemIncidentOut(BaseModel):
    id: str
    title: str
    description: str
    status: str
    occurredAt: str


class AdminSystemStatusOut(BaseModel):
    overallStatus: str
    overallLabel: str
    uptimePercent: str
    lastUpdated: str
    services: list[SystemServiceOut]
    metrics: list[SystemMetricOut]
    incidents: list[SystemIncidentOut]
