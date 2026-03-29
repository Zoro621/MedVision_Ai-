import type { 
  DashboardUser, 
  FlashcardDeck, 
  Flashcard,
  Quiz, 
  QuizQuestion,
  TopicMastery, 
  LeaderboardEntry, 
  Badge,
  UploadedSource,
  Notification,
  StudyActivity,
  DailyChallenge,
  Achievement,
} from '@/types/dashboard';

export const MOCK_USER: DashboardUser = {
  id: 'user_001',
  fullName: 'Jane Smith',
  email: 'jane@hospital.edu',
  role: 'student',
  avatarInitials: 'JS',
  trainingLevel: 'PGY-2 Resident',
  radiologyFocus: ['Chest', 'Neuro'],
  xp: 2340,
  level: 4,
  levelTitle: 'Fellow',
  streakDays: 12,
  xpToNextLevel: 3000,
};

export const MOCK_DECKS: FlashcardDeck[] = [
  { 
    id: 'deck_001', 
    title: 'Pulmonary Embolism', 
    topic: 'Chest', 
    totalCards: 20, 
    dueCards: 12, 
    masteredCards: 8, 
    lastStudied: 'today',
    sourceDocument: 'Radiology_Textbook.pdf'
  },
  { 
    id: 'deck_002', 
    title: 'Brain MRI Anatomy', 
    topic: 'Neuro', 
    totalCards: 50, 
    dueCards: 3, 
    masteredCards: 30, 
    lastStudied: '2 days ago',
    sourceDocument: 'Neuro_Imaging_Guide.pdf'
  },
  { 
    id: 'deck_003', 
    title: 'MSK Fracture Classification', 
    topic: 'MSK', 
    totalCards: 15, 
    dueCards: 0, 
    masteredCards: 15, 
    lastStudied: 'yesterday',
    sourceDocument: 'MSK_Radiology.pdf'
  },
  { 
    id: 'deck_004', 
    title: 'Liver Lesions CT', 
    topic: 'Abdominal', 
    totalCards: 25, 
    dueCards: 8, 
    masteredCards: 10, 
    lastStudied: '3 days ago',
    sourceDocument: 'Abdominal_CT.pdf'
  },
];

export const MOCK_FLASHCARDS: Record<string, Flashcard[]> = {
  'deck_001': [
    {
      id: 'card_001',
      deckId: 'deck_001',
      front: 'What is the "polo mint sign" in CT pulmonary angiography?',
      back: 'The "polo mint sign" refers to the appearance of a filling defect within the pulmonary artery on axial CT — the thrombus appears as a low-density ring surrounded by contrast-enhanced blood.',
      sourceDocument: 'Radiology_Textbook.pdf',
      sourcePage: 243,
      difficulty: 'good',
      nextReviewDate: new Date().toISOString(),
      reviewCount: 3,
    },
    {
      id: 'card_002',
      deckId: 'deck_001',
      front: 'What are the direct signs of pulmonary embolism on CTPA?',
      back: '1. Intraluminal filling defect (partial or complete occlusion)\n2. Polo mint sign (axial view)\n3. Railway track sign (longitudinal view)\n4. Vessel cutoff with distal oligemia',
      sourceDocument: 'Radiology_Textbook.pdf',
      sourcePage: 244,
      difficulty: 'hard',
      nextReviewDate: new Date().toISOString(),
      reviewCount: 2,
    },
    {
      id: 'card_003',
      deckId: 'deck_001',
      front: 'What are the indirect signs of pulmonary embolism?',
      back: '1. Wedge-shaped peripheral consolidation (Hampton hump)\n2. Mosaic attenuation pattern\n3. Pleural effusion\n4. Right heart strain (RV:LV ratio > 1)\n5. Pulmonary infarction',
      sourceDocument: 'Radiology_Textbook.pdf',
      sourcePage: 245,
      difficulty: 'good',
      nextReviewDate: new Date().toISOString(),
      reviewCount: 4,
    },
    {
      id: 'card_004',
      deckId: 'deck_001',
      front: 'What is the sensitivity and specificity of CTPA for PE diagnosis?',
      back: 'CTPA has a sensitivity of 83-100% and specificity of 89-97% for detecting pulmonary embolism. It is the gold standard imaging modality for PE diagnosis.',
      sourceDocument: 'Radiology_Textbook.pdf',
      sourcePage: 242,
      difficulty: 'easy',
      nextReviewDate: new Date().toISOString(),
      reviewCount: 5,
    },
  ],
};

export const MOCK_QUIZZES: Quiz[] = [
  { 
    id: 'quiz_001', 
    title: 'Chest CT Findings', 
    topic: 'Chest', 
    difficulty: 'Intermediate', 
    questionCount: 15, 
    bestScore: 85, 
    attempts: 3, 
    estimatedMinutes: 12,
    isNew: false,
    sourceDocument: 'Radiology_Textbook.pdf'
  },
  { 
    id: 'quiz_002', 
    title: 'Neuro MRI Basics', 
    topic: 'Neuro', 
    difficulty: 'Beginner', 
    questionCount: 10, 
    bestScore: 62, 
    attempts: 2, 
    estimatedMinutes: 8,
    isNew: false,
    sourceDocument: 'Neuro_Imaging_Guide.pdf'
  },
  { 
    id: 'quiz_003', 
    title: 'Abdominal CT — Liver', 
    topic: 'Abdominal', 
    difficulty: 'Advanced', 
    questionCount: 20, 
    bestScore: 91, 
    attempts: 1, 
    estimatedMinutes: 18,
    isNew: false,
    sourceDocument: 'Abdominal_CT.pdf'
  },
  { 
    id: 'quiz_004', 
    title: 'MSK Trauma Imaging', 
    topic: 'MSK', 
    difficulty: 'Intermediate', 
    questionCount: 12, 
    attempts: 0, 
    estimatedMinutes: 10,
    isNew: true,
    sourceDocument: 'MSK_Radiology.pdf'
  },
  { 
    id: 'quiz_005', 
    title: 'Cardiac CT Fundamentals', 
    topic: 'Cardiac', 
    difficulty: 'Beginner', 
    questionCount: 8, 
    attempts: 0, 
    estimatedMinutes: 6,
    isNew: true,
  },
];

export const MOCK_QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q_001',
    questionText: 'A 45-year-old presents with acute dyspnoea. The CT shows a filling defect in the right pulmonary artery. What is the most likely diagnosis?',
    options: [
      { label: 'A', text: 'Pneumonia' },
      { label: 'B', text: 'Pulmonary Embolism' },
      { label: 'C', text: 'Aortic Dissection' },
      { label: 'D', text: 'Lung Cancer' },
    ],
    correctAnswer: 'B',
    explanation: 'Pulmonary embolism presents as a filling defect (hypodense area) within the pulmonary artery on CT angiography. The acute presentation with dyspnoea and the location of the finding strongly suggest PE.',
    sourceDocument: 'Radiology_Textbook.pdf',
    sourcePage: 243,
  },
  {
    id: 'q_002',
    questionText: 'Which of the following is NOT a direct sign of pulmonary embolism on CTPA?',
    options: [
      { label: 'A', text: 'Intraluminal filling defect' },
      { label: 'B', text: 'Hampton hump' },
      { label: 'C', text: 'Railway track sign' },
      { label: 'D', text: 'Complete vessel occlusion' },
    ],
    correctAnswer: 'B',
    explanation: 'Hampton hump is an INDIRECT sign of PE - it represents pulmonary infarction appearing as a wedge-shaped peripheral consolidation. Direct signs include filling defects, railway track sign, and vessel occlusion.',
    sourceDocument: 'Radiology_Textbook.pdf',
    sourcePage: 245,
  },
  {
    id: 'q_003',
    questionText: 'What RV:LV ratio on CT indicates right heart strain in the context of PE?',
    options: [
      { label: 'A', text: '> 0.5' },
      { label: 'B', text: '> 0.9' },
      { label: 'C', text: '> 1.0' },
      { label: 'D', text: '> 1.5' },
    ],
    correctAnswer: 'C',
    explanation: 'An RV:LV ratio greater than 1.0 indicates right ventricular dilatation and is a sign of right heart strain, which can occur in massive or submassive PE and is associated with adverse outcomes.',
    sourceDocument: 'Radiology_Textbook.pdf',
    sourcePage: 246,
  },
  {
    id: 'q_004',
    questionText: 'The "polo mint sign" on axial CTPA is characteristic of:',
    options: [
      { label: 'A', text: 'Complete vessel occlusion' },
      { label: 'B', text: 'Partial filling defect with surrounding contrast' },
      { label: 'C', text: 'Chronic thromboembolic disease' },
      { label: 'D', text: 'Pulmonary artery aneurysm' },
    ],
    correctAnswer: 'B',
    explanation: 'The polo mint sign describes a partial filling defect surrounded by contrast material, creating an appearance similar to a polo mint candy when viewed on axial images.',
    sourceDocument: 'Radiology_Textbook.pdf',
    sourcePage: 243,
  },
  {
    id: 'q_005',
    questionText: 'Which imaging modality is the gold standard for diagnosing acute PE?',
    options: [
      { label: 'A', text: 'Chest X-ray' },
      { label: 'B', text: 'V/Q scan' },
      { label: 'C', text: 'CT Pulmonary Angiography' },
      { label: 'D', text: 'MR Angiography' },
    ],
    correctAnswer: 'C',
    explanation: 'CT Pulmonary Angiography (CTPA) is the gold standard for diagnosing acute pulmonary embolism due to its high sensitivity (83-100%) and specificity (89-97%), rapid acquisition, and wide availability.',
    sourceDocument: 'Radiology_Textbook.pdf',
    sourcePage: 242,
  },
];

export const MOCK_TOPIC_MASTERY: TopicMastery[] = [
  { topic: 'Chest', mastery: 78, quizzes: 12, flashcardsTotal: 60, flashcardsDone: 45 },
  { topic: 'Neuro', mastery: 60, quizzes: 8, flashcardsTotal: 50, flashcardsDone: 30 },
  { topic: 'MSK', mastery: 70, quizzes: 6, flashcardsTotal: 30, flashcardsDone: 20 },
  { topic: 'Abdominal', mastery: 40, quizzes: 4, flashcardsTotal: 40, flashcardsDone: 10 },
  { topic: 'Cardiac', mastery: 20, quizzes: 2, flashcardsTotal: 20, flashcardsDone: 5 },
  { topic: 'Paediatric', mastery: 10, quizzes: 1, flashcardsTotal: 15, flashcardsDone: 2 },
];

export const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Alex Chen', xp: 4200, streak: 21, level: 5 },
  { rank: 2, name: 'Priya Sharma', xp: 3840, streak: 18, level: 5 },
  { rank: 3, name: 'Mohammed Al-Rashid', xp: 3200, streak: 14, level: 4 },
  { rank: 4, name: 'Sarah Kim', xp: 2800, streak: 10, level: 4 },
  { rank: 5, name: 'Jane Smith', xp: 2340, streak: 12, level: 4, isCurrentUser: true },
  { rank: 6, name: 'Liam O\'Brien', xp: 2100, streak: 8, level: 3 },
  { rank: 7, name: 'Yuna Park', xp: 1900, streak: 6, level: 3 },
  { rank: 8, name: 'David Martinez', xp: 1750, streak: 5, level: 3 },
  { rank: 9, name: 'Emma Wilson', xp: 1600, streak: 4, level: 2 },
  { rank: 10, name: 'James Taylor', xp: 1450, streak: 3, level: 2 },
];

export const MOCK_BADGES: Badge[] = [
  { 
    id: 'badge_001', 
    name: 'First Blood', 
    description: 'Complete your first quiz', 
    condition: 'Complete 1 quiz',
    icon: '🩺', 
    earned: true, 
    earnedAt: '2024-01-15' 
  },
  { 
    id: 'badge_002', 
    name: 'Streak Starter', 
    description: 'Maintain a 7-day study streak', 
    condition: '7 consecutive days',
    icon: '🔥', 
    earned: true, 
    earnedAt: '2024-01-22' 
  },
  { 
    id: 'badge_003', 
    name: 'Speed Reader', 
    description: 'Review 50 flashcards in one session', 
    condition: '50 cards in one session',
    icon: '⚡', 
    earned: true, 
    earnedAt: '2024-02-01' 
  },
  { 
    id: 'badge_004', 
    name: 'CT Expert', 
    description: 'Score 90%+ on 5 CT-related quizzes', 
    condition: '5 quizzes with 90%+ score',
    icon: '🎯', 
    earned: true, 
    earnedAt: '2024-02-10' 
  },
  { 
    id: 'badge_005', 
    name: 'Dedicated Learner', 
    description: 'Study for 10 hours total', 
    condition: '10 hours of study time',
    icon: '📚', 
    earned: true, 
    earnedAt: '2024-02-15' 
  },
  { 
    id: 'badge_006', 
    name: 'Quiz Master', 
    description: 'Complete 20 quizzes', 
    condition: '20 quizzes completed',
    icon: '🏅', 
    earned: true, 
    earnedAt: '2024-02-20' 
  },
  { 
    id: 'badge_007', 
    name: 'Iron Will', 
    description: 'Maintain a 30-day study streak', 
    condition: '30 consecutive days',
    icon: '💪', 
    earned: false, 
    progress: 12, 
    progressMax: 30 
  },
  { 
    id: 'badge_008', 
    name: 'Polymath', 
    description: 'Achieve 80%+ mastery in all topics', 
    condition: '80%+ in all 6 topics',
    icon: '🧠', 
    earned: false, 
    progress: 2, 
    progressMax: 6 
  },
  { 
    id: 'badge_009', 
    name: 'Perfect Score', 
    description: 'Score 100% on any quiz', 
    condition: '100% quiz score',
    icon: '💯', 
    earned: false, 
    progress: 91, 
    progressMax: 100 
  },
  { 
    id: 'badge_010', 
    name: 'Night Owl', 
    description: 'Study after midnight 10 times', 
    condition: '10 midnight sessions',
    icon: '🦉', 
    earned: false, 
    progress: 3, 
    progressMax: 10 
  },
];

export const MOCK_UPLOADED_SOURCES: UploadedSource[] = [
  { 
    id: 'src_001', 
    name: 'Radiology_Textbook.pdf', 
    type: 'pdf', 
    status: 'indexed', 
    pages: 423, 
    chapters: 'Chapter 1-18',
    size: '1.2 MB'
  },
  { 
    id: 'src_002', 
    name: 'Chest_CT_Lecture_Notes.pdf', 
    type: 'pdf', 
    status: 'indexed', 
    pages: 45,
    size: '340 KB'
  },
  { 
    id: 'src_003', 
    name: 'PE_CT_Scan.dcm', 
    type: 'dicom', 
    status: 'indexed',
    size: '512 KB'
  },
  { 
    id: 'src_004', 
    name: 'MSK_Notes_Draft.pdf', 
    type: 'pdf', 
    status: 'processing', 
    progress: 40,
    size: '280 KB'
  },
];

export const MOCK_NOTIFICATIONS: Notification[] = [
  { 
    id: 'notif_001', 
    title: 'Daily Challenge Available', 
    message: 'A new daily challenge is waiting for you!', 
    type: 'info', 
    read: false, 
    timestamp: new Date().toISOString() 
  },
  { 
    id: 'notif_002', 
    title: 'Streak at Risk!', 
    message: 'Complete a study session today to maintain your 12-day streak.', 
    type: 'warning', 
    read: false, 
    timestamp: new Date(Date.now() - 3600000).toISOString() 
  },
  { 
    id: 'notif_003', 
    title: 'New Quiz Available', 
    message: 'MSK Trauma Imaging quiz has been added to your library.', 
    type: 'info', 
    read: true, 
    timestamp: new Date(Date.now() - 86400000).toISOString() 
  },
  { 
    id: 'notif_004', 
    title: 'Badge Earned!', 
    message: 'You earned the "Quiz Master" badge!', 
    type: 'achievement', 
    read: true, 
    timestamp: new Date(Date.now() - 172800000).toISOString() 
  },
];

export const MOCK_STUDY_ACTIVITY: StudyActivity[] = Array.from({ length: 84 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (83 - i));
  const isActive = Math.random() > 0.3;
  return {
    date: date.toISOString().split('T')[0],
    quizzes: isActive ? Math.floor(Math.random() * 5) : 0,
    flashcards: isActive ? Math.floor(Math.random() * 50) : 0,
    minutes: isActive ? Math.floor(Math.random() * 60) + 10 : 0,
  };
});

export const MOCK_DAILY_CHALLENGE: DailyChallenge = {
  id: 'challenge_001',
  title: 'Identify the key CT findings in pulmonary embolism',
  description: 'Test your knowledge of PE imaging findings',
  topic: 'Chest',
  difficulty: 'Intermediate',
  xpReward: 150,
  badgeProgress: '"Daily Warrior" badge progress',
  expiresAt: new Date(new Date().setHours(23, 59, 59, 999)).toISOString(),
  completed: false,
};

export const MOCK_RECENT_QUIZZES = [
  { title: 'Chest CT Findings', score: 85, daysAgo: 2 },
  { title: 'Neuro MRI Basics', score: 62, daysAgo: 4 },
  { title: 'Abdominal CT — Liver', score: 91, daysAgo: 7 },
];

export const LEVEL_TITLES: Record<number, string> = {
  1: 'Intern',
  2: 'Junior Resident',
  3: 'Senior Resident',
  4: 'Fellow',
  5: 'Attending',
  6: 'Radiologist',
};

export const LEVEL_XP_REQUIREMENTS: Record<number, number> = {
  1: 500,
  2: 1000,
  3: 2000,
  4: 3000,
  5: 5000,
  6: 8000,
};

export const MOCK_ACHIEVEMENTS: Achievement[] = [
  {
    id: "ach_001",
    title: "First Study Session",
    description: "Complete your first study session",
    icon: "BookOpen",
    tier: "bronze",
    unlockedAt: "2024-01-15",
    progress: 100,
    maxProgress: 1,
    category: "learning",
  },
  {
    id: "ach_002",
    title: "Quiz Master",
    description: "Score 90%+ on 10 quizzes",
    icon: "Trophy",
    tier: "silver",
    unlockedAt: "2024-02-01",
    progress: 100,
    maxProgress: 10,
    category: "performance",
  },
  {
    id: "ach_003",
    title: "Flashcard Guru",
    description: "Review 1,000 flashcards",
    icon: "Brain",
    tier: "gold",
    unlockedAt: null,
    progress: 734,
    maxProgress: 1000,
    category: "learning",
  },
  {
    id: "ach_004",
    title: "Chest Expert",
    description: "Master chest radiology with 50+ correct answers",
    icon: "Target",
    tier: "platinum",
    unlockedAt: null,
    progress: 32,
    maxProgress: 50,
    category: "specialty",
  },
  {
    id: "ach_005",
    title: "Week Warrior",
    description: "Study 5 days in a row",
    icon: "Flame",
    tier: "silver",
    unlockedAt: "2024-01-28",
    progress: 100,
    maxProgress: 5,
    category: "consistency",
  },
  {
    id: "ach_006",
    title: "Night Owl",
    description: "Complete 10 study sessions after 8 PM",
    icon: "Moon",
    tier: "bronze",
    unlockedAt: "2024-02-05",
    progress: 100,
    maxProgress: 10,
    category: "learning",
  },
  {
    id: "ach_007",
    title: "Neuro Navigator",
    description: "Achieve 85%+ mastery in neuro radiology",
    icon: "Zap",
    tier: "gold",
    unlockedAt: null,
    progress: 78,
    maxProgress: 85,
    category: "specialty",
  },
  {
    id: "ach_008",
    title: "30-Day Streak",
    description: "Maintain a 30-day study streak",
    icon: "Calendar",
    tier: "platinum",
    unlockedAt: null,
    progress: 18,
    maxProgress: 30,
    category: "consistency",
  },
];

// Helper function to simulate async data fetching
export const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
