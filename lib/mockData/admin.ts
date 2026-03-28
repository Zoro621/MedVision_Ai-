import type {
  AdminStudentRow,
  AdminQuiz,
  AdminFlashcardTemplate,
  SharedMaterial,
  AuditLogEntry,
  SystemService,
  QuizItemAnalytic,
  PlatformStats,
  AICorrection,
  LiveActivityItem,
  TopicPerformance,
  StudentNote,
  QuizAttemptAdmin,
  SystemEvent,
  PlatformActivityData,
  AdminSettings,
} from '@/types/admin';

export const MOCK_PLATFORM_STATS: PlatformStats = {
  totalStudents: 142,
  newToday: 23,
  quizzesToday: 318,
  flashcardsToday: 1247,
  aiAccuracy: 94,
  studentsAtRisk: 3,
};

export const MOCK_STUDENTS: AdminStudentRow[] = [
  { id: 'user_001', name: 'Jane Smith', email: 'jane@hospital.edu', level: 4, levelTitle: 'Fellow', avgScore: 78, streak: 12, xp: 2340, status: 'active', risk: 'on-track', avatarInitials: 'JS', joinedAt: '2026-01-15', radiologyFocus: ['Chest', 'Neuro'], totalStudyTime: 2538, quizzesTaken: 45, lastActive: '2026-03-09T10:42:00' },
  { id: 'user_002', name: 'Alex Chen', email: 'alex@med.edu', level: 5, levelTitle: 'Attending', avgScore: 91, streak: 21, xp: 4200, status: 'active', risk: 'thriving', avatarInitials: 'AC', joinedAt: '2025-11-20', radiologyFocus: ['Neuro', 'MSK'], totalStudyTime: 4280, quizzesTaken: 72, lastActive: '2026-03-09T09:15:00' },
  { id: 'user_003', name: 'Priya Sharma', email: 'priya@univ.edu', level: 5, levelTitle: 'Attending', avgScore: 88, streak: 18, xp: 3840, status: 'active', risk: 'thriving', avatarInitials: 'PS', joinedAt: '2025-12-01', radiologyFocus: ['Chest'], totalStudyTime: 3650, quizzesTaken: 61, lastActive: '2026-03-09T08:30:00' },
  { id: 'user_004', name: 'Mohammed Al-Rashid', email: 'mo@hospital.edu', level: 4, levelTitle: 'Fellow', avgScore: 75, streak: 14, xp: 3200, status: 'active', risk: 'on-track', avatarInitials: 'MA', joinedAt: '2025-10-15', radiologyFocus: ['Abdominal', 'Cardiac'], totalStudyTime: 2890, quizzesTaken: 48, lastActive: '2026-03-08T22:10:00' },
  { id: 'user_005', name: 'Jane Cooper', email: 'jc@hospital.edu', level: 1, levelTitle: 'Intern', avgScore: 38, streak: 0, xp: 240, status: 'inactive', risk: 'at-risk', avatarInitials: 'JC', joinedAt: '2026-02-28', radiologyFocus: ['Chest'], totalStudyTime: 180, quizzesTaken: 8, lastActive: '2026-03-04T15:00:00' },
  { id: 'user_006', name: 'Tom Harris', email: 'th@medschool.edu', level: 2, levelTitle: 'Jr Resident', avgScore: 41, streak: 0, xp: 480, status: 'active', risk: 'at-risk', avatarInitials: 'TH', joinedAt: '2026-02-15', radiologyFocus: ['Neuro'], totalStudyTime: 320, quizzesTaken: 12, lastActive: '2026-03-09T07:45:00' },
  { id: 'user_007', name: 'Lisa Huang', email: 'lh@hospital.edu', level: 2, levelTitle: 'Jr Resident', avgScore: 44, streak: 2, xp: 610, status: 'inactive', risk: 'at-risk', avatarInitials: 'LH', joinedAt: '2026-02-10', radiologyFocus: ['MSK'], totalStudyTime: 410, quizzesTaken: 15, lastActive: '2026-03-06T18:20:00' },
  { id: 'user_008', name: 'Yuna Park', email: 'yuna@med.edu', level: 3, levelTitle: 'Sr Resident', avgScore: 72, streak: 8, xp: 1850, status: 'active', risk: 'on-track', avatarInitials: 'YP', joinedAt: '2026-01-05', radiologyFocus: ['Paediatric'], totalStudyTime: 1620, quizzesTaken: 32, lastActive: '2026-03-09T11:00:00' },
  { id: 'user_009', name: 'David Kim', email: 'dkim@hospital.edu', level: 4, levelTitle: 'Fellow', avgScore: 82, streak: 15, xp: 2780, status: 'active', risk: 'on-track', avatarInitials: 'DK', joinedAt: '2025-12-20', radiologyFocus: ['Interventional'], totalStudyTime: 2340, quizzesTaken: 40, lastActive: '2026-03-09T10:15:00' },
  { id: 'user_010', name: 'Sarah Johnson', email: 'sjohnson@univ.edu', level: 1, levelTitle: 'Intern', avgScore: 65, streak: 5, xp: 520, status: 'new', risk: 'on-track', avatarInitials: 'SJ', joinedAt: '2026-03-05', radiologyFocus: ['Chest', 'Abdominal'], totalStudyTime: 240, quizzesTaken: 6, lastActive: '2026-03-09T09:30:00' },
];

export const MOCK_QUIZZES_ADMIN: AdminQuiz[] = [
  { id: 'quiz_001', title: 'Chest CT Findings', topic: 'Chest', difficulty: 'Intermediate', questions: 15, status: 'published', usedBy: 89, avgScore: 79, estimatedTime: 12, lastEditedAt: '2026-03-08', lastEditedBy: 'Admin' },
  { id: 'quiz_002', title: 'Neuro MRI Basics', topic: 'Neuro', difficulty: 'Beginner', questions: 10, status: 'published', usedBy: 72, avgScore: 62, estimatedTime: 8, lastEditedAt: '2026-03-05', lastEditedBy: 'Admin' },
  { id: 'quiz_003', title: 'Abdominal CT Advanced', topic: 'Abdominal', difficulty: 'Advanced', questions: 20, status: 'draft', usedBy: 0, avgScore: 0, estimatedTime: 18, lastEditedAt: '2026-03-07', lastEditedBy: 'Admin' },
  { id: 'quiz_004', title: 'MSK Radiographs', topic: 'MSK', difficulty: 'Intermediate', questions: 12, status: 'published', usedBy: 54, avgScore: 71, estimatedTime: 10, lastEditedAt: '2026-02-28', lastEditedBy: 'Admin' },
  { id: 'quiz_005', title: 'Cardiac Imaging', topic: 'Cardiac', difficulty: 'Advanced', questions: 18, status: 'published', usedBy: 38, avgScore: 45, estimatedTime: 15, lastEditedAt: '2026-03-01', lastEditedBy: 'Admin' },
  { id: 'quiz_006', title: 'Paediatric Basics', topic: 'Paediatric', difficulty: 'Beginner', questions: 8, status: 'archived', usedBy: 22, avgScore: 68, estimatedTime: 6, lastEditedAt: '2026-01-15', lastEditedBy: 'Admin' },
];

export const MOCK_FLASHCARD_TEMPLATES: AdminFlashcardTemplate[] = [
  { id: 'fc_001', title: 'Chest X-Ray Anatomy', topic: 'Chest', cardCount: 45, status: 'published', usedBy: 98, lastEditedAt: '2026-03-06' },
  { id: 'fc_002', title: 'Neuro Pathology', topic: 'Neuro', cardCount: 60, status: 'published', usedBy: 76, lastEditedAt: '2026-03-04' },
  { id: 'fc_003', title: 'MSK Fractures', topic: 'MSK', cardCount: 38, status: 'draft', usedBy: 0, lastEditedAt: '2026-03-08' },
  { id: 'fc_004', title: 'Abdominal Emergencies', topic: 'Abdominal', cardCount: 52, status: 'published', usedBy: 64, lastEditedAt: '2026-02-20' },
];

export const MOCK_SHARED_MATERIALS: SharedMaterial[] = [
  { id: 'mat_001', filename: 'Radiology_Reference_2026.pdf', topic: 'General', uploadedAt: '2026-03-01', size: '4.2MB', uploadedBy: 'Admin' },
  { id: 'mat_002', filename: 'CT_Protocols_Guide.pdf', topic: 'Chest', uploadedAt: '2026-02-15', size: '2.1MB', uploadedBy: 'Admin' },
  { id: 'mat_003', filename: 'MRI_Safety_Handbook.pdf', topic: 'General', uploadedAt: '2026-02-10', size: '1.8MB', uploadedBy: 'Admin' },
  { id: 'mat_004', filename: 'Neuro_Anatomy_Atlas.pdf', topic: 'Neuro', uploadedAt: '2026-01-28', size: '8.4MB', uploadedBy: 'Admin' },
];

export const MOCK_AUDIT_LOG: AuditLogEntry[] = [
  { id: 'log_001', timestamp: '2026-03-09T09:42:31', actor: 'Admin', actorType: 'admin', action: 'Published quiz', entity: 'Quiz #4', details: { quizId: 'quiz_004', title: 'MSK Radiographs' } },
  { id: 'log_002', timestamp: '2026-03-09T09:38:15', actor: 'Jane Smith', actorType: 'student', action: 'Completed quiz — Score: 85%', entity: 'Quiz #4', details: { score: 85, timeMs: 582000 } },
  { id: 'log_003', timestamp: '2026-03-09T09:35:02', actor: 'AI System', actorType: 'ai', action: 'RAG retrieval — 3 sources', entity: 'Query', details: { query: 'What are CT findings in PE?', faithfulness: 0.96, responseMs: 1240, sources: 3 } },
  { id: 'log_004', timestamp: '2026-03-09T09:30:48', actor: 'Alex Chen', actorType: 'student', action: 'Uploaded PDF', entity: 'File', details: { filename: 'Chest_Notes.pdf', size: '1.2MB' } },
  { id: 'log_005', timestamp: '2026-03-09T09:15:00', actor: 'Admin', actorType: 'admin', action: 'Logged in (2FA verified)', entity: 'Session', details: { ip: '192.168.1.100', browser: 'Chrome' } },
  { id: 'log_006', timestamp: '2026-03-08T22:10:05', actor: 'Mohammed Al-Rashid', actorType: 'student', action: 'Quiz failed (42%)', entity: 'Quiz #2', details: { score: 42, quizTitle: 'Neuro MRI Basics' } },
  { id: 'log_007', timestamp: '2026-03-08T20:30:00', actor: 'System', actorType: 'system', action: 'Daily backup completed', entity: 'Database', details: { size: '2.3GB', duration: '45s' } },
  { id: 'log_008', timestamp: '2026-03-08T18:45:12', actor: 'AI System', actorType: 'ai', action: 'RAG retrieval — 2 sources', entity: 'Query', details: { query: 'Normal aorta size on CT', faithfulness: 0.88, responseMs: 980, sources: 2 } },
  { id: 'log_009', timestamp: '2026-03-08T15:20:30', actor: 'Priya Sharma', actorType: 'student', action: 'Reviewed 20 flashcards', entity: 'Deck: Chest X-Ray', details: { deckId: 'fc_001', cardsReviewed: 20 } },
  { id: 'log_010', timestamp: '2026-03-08T14:00:00', actor: 'Admin', actorType: 'admin', action: 'Created new quiz', entity: 'Quiz #6', details: { title: 'Paediatric Basics', questions: 8 } },
];

export const MOCK_SYSTEM_SERVICES: SystemService[] = [
  { name: 'API Server', icon: 'Server', status: 'operational', latencyMs: 42, uptime: 99.9 },
  { name: 'PostgreSQL', icon: 'Database', status: 'operational', latencyMs: 12, connections: { used: 18, max: 100 } },
  { name: 'Milvus VDB', icon: 'Brain', status: 'operational', latencyMs: 28, vectors: 1200000 },
  { name: 'AI / LLM', icon: 'Bot', status: 'operational', avgResponseMs: 1240, requestsToday: 847, tokensPerMin: 4000 },
  { name: 'OCR Service', icon: 'ScanText', status: 'degraded', queueSize: 3, avgProcessingMs: 8200 },
  { name: 'File Storage', icon: 'HardDrive', status: 'operational', usedGB: 2.3, limitGB: 50 },
];

export const MOCK_ITEM_ANALYTICS: QuizItemAnalytic[] = [
  { questionId: 'q_001', text: 'What is the polo mint sign in CT angiography?', quizTitle: 'Chest CT', correctRate: 0.91, irtDifficulty: 0.5, flagged: false },
  { questionId: 'q_002', text: 'Identify consolidation vs ground-glass opacity', quizTitle: 'Chest CT', correctRate: 0.43, irtDifficulty: 0.8, flagged: true },
  { questionId: 'q_003', text: 'CT findings in saddle pulmonary embolism', quizTitle: 'Chest CT', correctRate: 0.28, irtDifficulty: 1.2, flagged: true },
  { questionId: 'q_004', text: 'MRI sequences for acute stroke evaluation', quizTitle: 'Neuro MRI', correctRate: 0.65, irtDifficulty: 0.6, flagged: false },
  { questionId: 'q_005', text: 'Cardiac CT gating techniques', quizTitle: 'Cardiac Imaging', correctRate: 0.32, irtDifficulty: 1.1, flagged: true },
];

export const MOCK_AI_CORRECTIONS: AICorrection[] = [
  { id: 'corr_001', query: 'What is the normal size of the aorta on CT?', aiResponse: 'The normal aortic diameter at the mid-descending thoracic aorta is typically less than 4 cm...', citation: 'Radiology_Textbook.pdf, p.188', flaggedBy: 'Jane Smith', flaggedAt: '2026-03-08T09:42:00', status: 'pending' },
  { id: 'corr_002', query: 'CT findings in acute pancreatitis', aiResponse: 'Acute pancreatitis on CT shows pancreatic enlargement with surrounding fat stranding...', citation: 'Abdominal_Imaging_Guide.pdf, p.312', flaggedBy: 'Alex Chen', flaggedAt: '2026-03-07T14:20:00', status: 'pending' },
  { id: 'corr_003', query: 'Hounsfield units for hemorrhage', aiResponse: 'Acute hemorrhage typically measures 50-70 HU on non-contrast CT...', citation: 'Neuro_Reference.pdf, p.88', flaggedBy: 'Priya Sharma', flaggedAt: '2026-03-06T11:15:00', status: 'pending' },
];

export const MOCK_LIVE_ACTIVITY: LiveActivityItem[] = [
  { id: 'act_001', studentName: 'Jane Smith', action: 'Completed quiz', detail: 'Score: 85%', timestamp: '2 min ago', type: 'success' },
  { id: 'act_002', studentName: 'Alex Chen', action: 'Reviewed 20 flashcards', detail: 'Deck: PE', timestamp: '3 min ago', type: 'success' },
  { id: 'act_003', studentName: 'Mohammed Al-Rashid', action: 'Quiz failed (42%)', detail: 'Neuro MRI Basics', timestamp: '5 min ago', type: 'warning' },
  { id: 'act_004', studentName: 'Priya Sharma', action: 'Uploaded new PDF', detail: 'Chest_Notes.pdf', timestamp: '8 min ago', type: 'neutral' },
  { id: 'act_005', studentName: 'Yuna Park', action: 'Badge earned', detail: 'Iron Will', timestamp: '12 min ago', type: 'achievement' },
  { id: 'act_006', studentName: 'David Kim', action: 'Started study session', detail: 'MSK Flashcards', timestamp: '15 min ago', type: 'success' },
];

export const MOCK_TOPIC_PERFORMANCE: TopicPerformance[] = [
  { topic: 'Chest', avgScore: 78, attempts: 245 },
  { topic: 'Neuro', avgScore: 61, attempts: 189 },
  { topic: 'MSK', avgScore: 70, attempts: 156 },
  { topic: 'Abdominal', avgScore: 43, attempts: 132 },
  { topic: 'Cardiac', avgScore: 31, attempts: 98 },
  { topic: 'Paediatric', avgScore: 24, attempts: 67 },
];

export const MOCK_CONTENT_STATUS = {
  quizzes: { published: 18, draft: 4, archived: 2 },
  flashcards: { published: 12, draft: 3, archived: 1 },
};

export const MOCK_STUDENT_NOTES: Record<string, StudentNote[]> = {
  'user_005': [
    { id: 'note_001', content: 'Student struggling with basic concepts. Recommended additional study materials.', author: 'Admin', createdAt: '2026-03-05T10:30:00' },
    { id: 'note_002', content: 'Scheduled follow-up meeting for progress review.', author: 'Admin', createdAt: '2026-03-03T14:15:00' },
  ],
  'user_006': [
    { id: 'note_003', content: 'Active but score dropping. May need intervention.', author: 'Admin', createdAt: '2026-03-08T09:00:00' },
  ],
};

export const MOCK_QUIZ_ATTEMPTS_ADMIN: Record<string, QuizAttemptAdmin[]> = {
  'user_001': [
    { id: 'att_001', quizTitle: 'Chest CT Findings', date: '2026-03-09', score: 85, timeMinutes: 10, xpEarned: 120, status: 'passed' },
    { id: 'att_002', quizTitle: 'Neuro MRI Basics', date: '2026-03-07', score: 62, timeMinutes: 12, xpEarned: 80, status: 'passed' },
    { id: 'att_003', quizTitle: 'Abdominal CT Advanced', date: '2026-03-05', score: 91, timeMinutes: 14, xpEarned: 150, status: 'passed' },
    { id: 'att_004', quizTitle: 'Cardiac Imaging', date: '2026-03-03', score: 44, timeMinutes: 8, xpEarned: 40, status: 'at-risk' },
  ],
};

export const MOCK_SYSTEM_EVENTS: SystemEvent[] = [
  { id: 'evt_001', timestamp: '2026-03-09T09:00:00', type: 'success', message: 'Scheduled maintenance completed successfully' },
  { id: 'evt_002', timestamp: '2026-03-09T08:45:00', type: 'warning', message: 'OCR queue backed up — 8 jobs pending (resolved)' },
  { id: 'evt_003', timestamp: '2026-03-09T08:30:00', type: 'success', message: 'Milvus index rebuild completed — 1.2M vectors' },
  { id: 'evt_004', timestamp: '2026-03-09T08:00:00', type: 'info', message: 'Daily database backup completed — 2.3GB' },
  { id: 'evt_005', timestamp: '2026-03-09T00:00:00', type: 'success', message: 'Scheduled maintenance window started' },
];

export const MOCK_PLATFORM_ACTIVITY: PlatformActivityData[] = [
  { date: '2026-02-24', quizAttempts: 42, activeStudents: 28, flashcardReviews: 180 },
  { date: '2026-02-25', quizAttempts: 38, activeStudents: 25, flashcardReviews: 165 },
  { date: '2026-02-26', quizAttempts: 55, activeStudents: 32, flashcardReviews: 220 },
  { date: '2026-02-27', quizAttempts: 48, activeStudents: 30, flashcardReviews: 195 },
  { date: '2026-02-28', quizAttempts: 62, activeStudents: 38, flashcardReviews: 245 },
  { date: '2026-03-01', quizAttempts: 35, activeStudents: 22, flashcardReviews: 140 },
  { date: '2026-03-02', quizAttempts: 28, activeStudents: 18, flashcardReviews: 110 },
  { date: '2026-03-03', quizAttempts: 52, activeStudents: 34, flashcardReviews: 210 },
  { date: '2026-03-04', quizAttempts: 58, activeStudents: 36, flashcardReviews: 230 },
  { date: '2026-03-05', quizAttempts: 65, activeStudents: 40, flashcardReviews: 260 },
  { date: '2026-03-06', quizAttempts: 70, activeStudents: 42, flashcardReviews: 280 },
  { date: '2026-03-07', quizAttempts: 48, activeStudents: 30, flashcardReviews: 190 },
  { date: '2026-03-08', quizAttempts: 32, activeStudents: 20, flashcardReviews: 125 },
  { date: '2026-03-09', quizAttempts: 45, activeStudents: 28, flashcardReviews: 175 },
];

export const MOCK_ADMIN_SETTINGS: AdminSettings = {
  platform: {
    name: 'MedVision AI',
    supportEmail: 'support@medvision.ai',
    maxFileUploadMB: 50,
    maxStudents: 500,
    maintenanceMode: false,
  },
  ai: {
    temperature: 0.3,
    maxTokens: 2048,
    faithfulnessThreshold: 0.85,
    gradcamEnabled: true,
    strictGrounding: false,
  },
  security: {
    require2FA: true,
    sessionTimeoutMinutes: 60,
    passwordRequirements: {
      uppercase: true,
      lowercase: true,
      numbers: true,
      special: true,
      minLength: 8,
    },
    ipWhitelist: [],
  },
  notifications: {
    newStudent: true,
    studentAtRisk: true,
    aiCorrectionQueued: true,
    systemDegradation: true,
    dailySummary: false,
    webhookUrl: '',
  },
};

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Intern',
  2: 'Jr Resident',
  3: 'Sr Resident',
  4: 'Fellow',
  5: 'Attending',
  6: 'Expert',
};

export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
