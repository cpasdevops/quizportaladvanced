export type UserRole = 'admin' | 'student';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  avatarUrl?: string;
  createdAt: string;
}

export interface Question {
  id: string;
  topicId: string;
  questionText: string;
  options: string[]; // exactly 4 options
  correctOption: number; // 0, 1, 2, 3
  explanation?: string;
  approved: boolean;
  createdAt: string;
}

export interface Topic {
  id: string;
  name: string;
  description: string;
  studyMaterialName?: string;
  studyMaterialUrl?: string;
  studyMaterialSize?: string;
  studyMaterialText?: string;
  questionCount: number;
  createdAt: string;
}

export type QuizStatus = 'draft' | 'active' | 'completed' | 'cancelled';

export interface Quiz {
  id: string;
  code: string; // 6-digit or alphanumeric code, e.g. "ETH-2026"
  title: string;
  topicId: string;
  topicName: string;
  status: QuizStatus;
  totalQuestions: number; // strictly 20
  timeLimitMinutes: number; // default 15 or 20 minutes
  questionIds: string[]; // 20 question IDs
  participantCount: number;
  submissionCount: number;
  createdBy: string;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}

export interface StudentAnswer {
  questionId: string;
  selectedOption: number | null; // index 0..3 or null if skipped
  isCorrect?: boolean;
  timeSpentSeconds?: number;
}

export interface QuizAttempt {
  id: string;
  quizId: string;
  quizCode: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  answers: Record<string, number | null>; // questionId -> selectedOption
  shuffledQuestionIds: string[]; // 20 randomized question order
  optionOrderMap: Record<string, number[]>; // questionId -> permuted options [0,1,2,3]
  startedAt: string;
  lastSavedAt: string;
  timeRemainingSeconds: number;
  isSubmitted: boolean;
}

export interface QuestionResultBreakdown {
  questionId: string;
  questionText: string;
  options: string[];
  userSelectedOption: number | null;
  correctOption: number;
  isCorrect: boolean;
  explanation?: string;
}

export interface QuizResult {
  id: string;
  quizId: string;
  quizCode: string;
  quizTitle: string;
  topicName: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  score: number; // 0 - 20
  totalQuestions: number; // 20
  percentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeTakenSeconds: number;
  breakdown: QuestionResultBreakdown[];
  submittedAt: string;
}
