export type RadiologyTopic = 
  | 'Chest' 
  | 'Neuro' 
  | 'MSK' 
  | 'Abdominal' 
  | 'Cardiac' 
  | 'Paediatric' 
  | 'Interventional';

export interface DashboardUser {
  id: string;
  fullName: string;
  email: string;
  role: 'student' | 'admin';
  avatarInitials: string;
  trainingLevel: string;
  radiologyFocus: RadiologyTopic[];
  xp: number;
  level: number;
  levelTitle: string;
  streakDays: number;
  xpToNextLevel: number;
}

export interface FlashcardDeck {
  id: string;
  title: string;
  topic: RadiologyTopic;
  totalCards: number;
  dueCards: number;
  masteredCards: number;
  lastStudied?: string;
  sourceDocument?: string;
}

export interface Flashcard {
  id: string;
  deckId: string;
  front: string;
  back: string;
  sourceDocument: string;
  sourcePage: number;
  difficulty: 'easy' | 'good' | 'hard' | 'again';
  nextReviewDate: string;
  reviewCount: number;
}

export interface Quiz {
  id: string;
  title: string;
  topic: RadiologyTopic;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questionCount: number;
  estimatedMinutes: number;
  bestScore?: number;
  attempts: number;
  isNew: boolean;
  sourceDocument?: string;
}

export interface QuizQuestion {
  id: string;
  questionText: string;
  options: { label: 'A' | 'B' | 'C' | 'D'; text: string }[];
  correctAnswer: 'A' | 'B' | 'C' | 'D';
  explanation: string;
  sourceDocument: string;
  sourcePage: number;
}

export interface TopicMastery {
  topic: RadiologyTopic;
  mastery: number;
  quizzes: number;
  flashcardsTotal: number;
  flashcardsDone: number;
}

export interface LeaderboardEntry {
  rank: number;
  name: string;
  xp: number;
  streak: number;
  level: number;
  isCurrentUser?: boolean;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  condition: string;
  icon: string;
  earned: boolean;
  earnedAt?: string;
  progress?: number;
  progressMax?: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  citations?: Citation[];
  confidence?: number;
}

export interface Citation {
  documentName: string;
  page: number;
  chapter: string;
  snippet: string;
}

export interface UploadedSource {
  id: string;
  name: string;
  type: 'pdf' | 'image' | 'dicom';
  status: 'indexed' | 'processing' | 'failed';
  progress?: number;
  pages?: number;
  chapters?: string;
  size: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'achievement';
  read: boolean;
  timestamp: string;
}

export interface StudyActivity {
  date: string;
  quizzes: number;
  flashcards: number;
  minutes: number;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  topic: RadiologyTopic;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  xpReward: number;
  badgeProgress?: string;
  expiresAt: string;
  completed: boolean;
}

export interface QuizAttempt {
  quizId: string;
  score: number;
  totalQuestions: number;
  completedAt: string;
  xpEarned: number;
  answers: {
    questionId: string;
    selectedAnswer: 'A' | 'B' | 'C' | 'D';
    isCorrect: boolean;
  }[];
  weakAreas?: string[];
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlockedAt: string | null;
  progress: number;
  maxProgress: number;
  category: 'learning' | 'performance' | 'specialty' | 'consistency';
}
