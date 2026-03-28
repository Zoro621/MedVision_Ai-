import type { RadiologyTopic } from './dashboard';

export type StudentRisk = 'at-risk' | 'on-track' | 'thriving';
export type StudentStatus = 'active' | 'inactive' | 'new' | 'suspended';
export type ContentStatus = 'published' | 'draft' | 'archived';
export type ServiceStatus = 'operational' | 'degraded' | 'outage';
export type AuditActorType = 'admin' | 'student' | 'ai' | 'system';
export type ActionType = 'admin' | 'student' | 'ai_retrieval' | 'system' | 'error';

export interface AdminStudentRow {
  id: string;
  name: string;
  email: string;
  level: number;
  levelTitle: string;
  avgScore: number;
  streak: number;
  xp: number;
  status: StudentStatus;
  risk: StudentRisk;
  avatarInitials?: string;
  joinedAt?: string;
  radiologyFocus?: RadiologyTopic[];
  totalStudyTime?: number;
  quizzesTaken?: number;
  lastActive?: string;
}

export interface AdminQuiz {
  id: string;
  title: string;
  topic: RadiologyTopic;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  questions: number;
  status: ContentStatus;
  usedBy: number;
  avgScore: number;
  estimatedTime?: number;
  lastEditedAt?: string;
  lastEditedBy?: string;
}

export interface AdminFlashcardTemplate {
  id: string;
  title: string;
  topic: RadiologyTopic;
  cardCount: number;
  status: ContentStatus;
  usedBy: number;
  lastEditedAt?: string;
}

export interface SharedMaterial {
  id: string;
  filename: string;
  topic: RadiologyTopic | 'General';
  uploadedAt: string;
  size: string;
  uploadedBy: string;
}

export interface QuizBuilderQuestion {
  id: string;
  type: 'mcq' | 'true-false' | 'image-based';
  questionText: string;
  options: QuizOption[];
  correctAnswer: string;
  explanation: string;
  imageUrl?: string;
  sourceDocument?: string;
  sourcePage?: number;
  irtDifficulty?: number;
  irtDiscrimination?: number;
  irtGuessing?: number;
  isComplete: boolean;
}

export interface QuizOption {
  label: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
  text: string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: string;
  actorType: AuditActorType;
  action: string;
  entity: string;
  details: Record<string, unknown>;
}

export interface SystemService {
  name: string;
  status: ServiceStatus;
  icon: string;
  latencyMs?: number;
  uptime?: number;
  connections?: { used: number; max: number };
  vectors?: number;
  avgResponseMs?: number;
  requestsToday?: number;
  queueSize?: number;
  avgProcessingMs?: number;
  usedGB?: number;
  limitGB?: number;
  tokensPerMin?: number;
}

export interface QuizItemAnalytic {
  questionId: string;
  text: string;
  quizTitle: string;
  correctRate: number;
  irtDifficulty: number;
  flagged: boolean;
}

export interface PlatformStats {
  totalStudents: number;
  newToday: number;
  quizzesToday: number;
  flashcardsToday: number;
  aiAccuracy: number;
  studentsAtRisk: number;
}

export interface AICorrection {
  id: string;
  query: string;
  aiResponse: string;
  citation: string;
  flaggedBy: string;
  flaggedAt: string;
  status: 'pending' | 'resolved' | 'dismissed';
}

export interface LiveActivityItem {
  id: string;
  studentName: string;
  action: string;
  detail?: string;
  timestamp: string;
  type: 'success' | 'warning' | 'neutral' | 'achievement';
}

export interface TopicPerformance {
  topic: RadiologyTopic;
  avgScore: number;
  attempts: number;
}

export interface StudentNote {
  id: string;
  content: string;
  author: string;
  createdAt: string;
}

export interface QuizAttemptAdmin {
  id: string;
  quizTitle: string;
  date: string;
  score: number;
  timeMinutes: number;
  xpEarned: number;
  status: 'passed' | 'at-risk';
}

export interface SystemEvent {
  id: string;
  timestamp: string;
  type: 'success' | 'warning' | 'info' | 'error';
  message: string;
}

export interface PlatformActivityData {
  date: string;
  quizAttempts: number;
  activeStudents: number;
  flashcardReviews: number;
}

export interface AdminSettings {
  platform: {
    name: string;
    supportEmail: string;
    maxFileUploadMB: number;
    maxStudents: number;
    maintenanceMode: boolean;
  };
  ai: {
    temperature: number;
    maxTokens: number;
    faithfulnessThreshold: number;
    gradcamEnabled: boolean;
    strictGrounding: boolean;
  };
  security: {
    require2FA: boolean;
    sessionTimeoutMinutes: number;
    passwordRequirements: {
      uppercase: boolean;
      lowercase: boolean;
      numbers: boolean;
      special: boolean;
      minLength: number;
    };
    ipWhitelist: string[];
  };
  notifications: {
    newStudent: boolean;
    studentAtRisk: boolean;
    aiCorrectionQueued: boolean;
    systemDegradation: boolean;
    dailySummary: boolean;
    webhookUrl: string;
  };
}
