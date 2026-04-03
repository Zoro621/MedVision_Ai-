from pydantic import BaseModel


class PlatformStatsOut(BaseModel):
    totalStudents: int
    newToday: int
    quizzesToday: int
    flashcardsToday: int
    aiAccuracy: int
    studentsAtRisk: int


class PlatformActivityPointOut(BaseModel):
    date: str
    quizAttempts: int
    activeStudents: int
    flashcardReviews: int


class LiveActivityItemOut(BaseModel):
    id: str
    studentName: str
    action: str
    detail: str | None = None
    timestamp: str
    type: str


class TopicPerformanceOut(BaseModel):
    topic: str
    avgScore: int
    attempts: int


class ContentStatusBucketOut(BaseModel):
    published: int
    draft: int
    archived: int


class ContentStatusOut(BaseModel):
    quizzes: ContentStatusBucketOut
    flashcards: ContentStatusBucketOut


class AdminStudentRiskOut(BaseModel):
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


class AdminOverviewOut(BaseModel):
    platformStats: PlatformStatsOut
    platformActivity: list[PlatformActivityPointOut]
    liveActivity: list[LiveActivityItemOut]
    topicPerformance: list[TopicPerformanceOut]
    contentStatus: ContentStatusOut
    studentsAtRisk: list[AdminStudentRiskOut]


class AnalyticsMetricOut(BaseModel):
    value: int
    change: int


class EngagementPointOut(BaseModel):
    date: str
    activeUsers: int
    newUsers: int
    returningUsers: int


class ContentUsagePointOut(BaseModel):
    name: str
    quizzes: int
    flashcards: int


class AiMetricPointOut(BaseModel):
    date: str
    accuracy: int
    usage: int


class DistributionSliceOut(BaseModel):
    name: str
    value: int
    color: str


class RetentionPointOut(BaseModel):
    week: str
    rate: int


class TopQuizOut(BaseModel):
    title: str
    attempts: int
    avgScore: int
    trend: str


class AnalyticsMetricsOut(BaseModel):
    activeStudents: AnalyticsMetricOut
    quizCompletions: AnalyticsMetricOut
    avgStudyTimeMinutes: AnalyticsMetricOut
    avgQuizScore: AnalyticsMetricOut


class AdminAnalyticsReportOut(BaseModel):
    metrics: AnalyticsMetricsOut
    engagementData: list[EngagementPointOut]
    contentUsage: list[ContentUsagePointOut]
    aiMetrics: list[AiMetricPointOut]
    studentDistribution: list[DistributionSliceOut]
    retentionData: list[RetentionPointOut]
    topQuizzes: list[TopQuizOut]
