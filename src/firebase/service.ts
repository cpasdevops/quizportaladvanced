import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  collection,
  setDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  getDocFromServer,
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytes, getDownloadURL } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';
import { Topic, Question, Quiz, QuizAttempt, QuizResult, QuizStatus } from '../types/quiz';
import { SEED_TOPIC, SEED_QUESTIONS, SEED_QUIZ } from '../data/seedData';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Connectivity check as instructed by firebase-integration skill
(async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or pending configuration.');
    }
  }
})();

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation handled: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Local storage backup keys for offline or immediate resilient fallback
const LS_TOPICS_KEY = 'qp_topics_v1';
const LS_QUESTIONS_KEY = 'qp_questions_v1';
const LS_QUIZZES_KEY = 'qp_quizzes_v1';
const LS_ATTEMPTS_KEY = 'qp_attempts_v1';
const LS_RESULTS_KEY = 'qp_results_v1';

function getLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function setLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

// Initialize seed data if not present locally
if (!localStorage.getItem(LS_TOPICS_KEY)) {
  setLocal(LS_TOPICS_KEY, [SEED_TOPIC]);
}
if (!localStorage.getItem(LS_QUESTIONS_KEY)) {
  setLocal(LS_QUESTIONS_KEY, SEED_QUESTIONS);
}
if (!localStorage.getItem(LS_QUIZZES_KEY)) {
  setLocal(LS_QUIZZES_KEY, [SEED_QUIZ]);
}
if (!localStorage.getItem(LS_RESULTS_KEY)) {
  setLocal(LS_RESULTS_KEY, []);
}

// ================= TOPICS =================
export async function fetchTopics(): Promise<Topic[]> {
  const localList = getLocal<Topic[]>(LS_TOPICS_KEY, [SEED_TOPIC]);

  // Non-blocking background sync with Firestore that MERGES rather than overwriting
  getDocs(collection(db, 'topics')).then(snap => {
    if (!snap.empty) {
      const fromRemote: Topic[] = [];
      snap.forEach(d => fromRemote.push(d.data() as Topic));

      const mergedMap = new Map<string, Topic>();
      // 1. Put current local topics into map first (preserve uploaded files)
      for (const t of getLocal<Topic[]>(LS_TOPICS_KEY, localList)) {
        mergedMap.set(t.id, t);
      }
      // 2. Merge remote fields without overwriting attached study materials if local has them
      for (const r of fromRemote) {
        const local = mergedMap.get(r.id);
        if (local) {
          mergedMap.set(r.id, {
            ...r,
            studyMaterialName: local.studyMaterialName || r.studyMaterialName,
            studyMaterialUrl: local.studyMaterialUrl || r.studyMaterialUrl,
            studyMaterialSize: local.studyMaterialSize || r.studyMaterialSize,
            studyMaterialText: local.studyMaterialText || r.studyMaterialText,
          });
        } else {
          mergedMap.set(r.id, r);
        }
      }
      setLocal(LS_TOPICS_KEY, Array.from(mergedMap.values()));
    }
  }).catch(() => {});

  return localList;
}

export async function saveTopic(topic: Topic): Promise<void> {
  const current = getLocal<Topic[]>(LS_TOPICS_KEY, [SEED_TOPIC]);
  const idx = current.findIndex(t => t.id === topic.id);
  if (idx >= 0) current[idx] = topic;
  else current.unshift(topic);
  setLocal(LS_TOPICS_KEY, current);

  // Background cloud sync - non-blocking
  setDoc(doc(db, 'topics', topic.id), topic).catch(err => {
    console.warn('Background topic sync info:', err);
  });
}

export async function removeTopic(topicId: string): Promise<void> {
  const current = getLocal<Topic[]>(LS_TOPICS_KEY, []);
  setLocal(LS_TOPICS_KEY, current.filter(t => t.id !== topicId));
  try {
    localStorage.removeItem(`qp_b64_mat_${topicId}`);
  } catch {}
  deleteDoc(doc(db, 'topics', topicId)).catch(() => {});
}

// ================= QUESTIONS =================
export async function fetchQuestions(topicId?: string): Promise<Question[]> {
  const all = getLocal<Question[]>(LS_QUESTIONS_KEY, SEED_QUESTIONS);
  // Fast background fetch
  const qCol = collection(db, 'questions');
  (topicId ? getDocs(query(qCol, where('topicId', '==', topicId))) : getDocs(qCol))
    .then(snap => {
      if (!snap.empty) {
        const list: Question[] = [];
        snap.forEach(d => list.push(d.data() as Question));
        if (!topicId) setLocal(LS_QUESTIONS_KEY, list);
      }
    })
    .catch(() => {});

  return topicId ? all.filter(q => q.topicId === topicId) : all;
}

export async function saveQuestion(question: Question): Promise<void> {
  const all = getLocal<Question[]>(LS_QUESTIONS_KEY, SEED_QUESTIONS);
  const idx = all.findIndex(q => q.id === question.id);
  if (idx >= 0) all[idx] = question;
  else all.push(question);
  setLocal(LS_QUESTIONS_KEY, all);

  setDoc(doc(db, 'questions', question.id), question).catch(() => {});
}

export async function saveQuestionsBatch(questions: Question[]): Promise<void> {
  const all = getLocal<Question[]>(LS_QUESTIONS_KEY, SEED_QUESTIONS);
  const map = new Map<string, Question>(all.map(q => [q.id, q]));
  for (const q of questions) {
    map.set(q.id, q);
  }
  setLocal(LS_QUESTIONS_KEY, Array.from(map.values()));

  // Background non-blocking sync
  Promise.all(questions.map(q => setDoc(doc(db, 'questions', q.id), q).catch(() => {}))).catch(() => {});
}

export async function removeQuestion(questionId: string): Promise<void> {
  const all = getLocal<Question[]>(LS_QUESTIONS_KEY, []);
  setLocal(LS_QUESTIONS_KEY, all.filter(q => q.id !== questionId));
  deleteDoc(doc(db, 'questions', questionId)).catch(() => {});
}

// ================= QUIZZES =================
export async function fetchQuizzes(): Promise<Quiz[]> {
  try {
    const snap = await getDocs(collection(db, 'quizzes'));
    if (!snap.empty) {
      const list: Quiz[] = [];
      snap.forEach(d => list.push(d.data() as Quiz));
      setLocal(LS_QUIZZES_KEY, list);
      return list;
    }
  } catch (err) {
    console.info('Using local quizzes cache:', err);
  }
  return getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
}

export async function fetchQuizByCode(code: string): Promise<Quiz | null> {
  const upper = code.trim().toUpperCase();
  try {
    const qCol = collection(db, 'quizzes');
    const snap = await getDocs(query(qCol, where('code', '==', upper)));
    if (!snap.empty) {
      return snap.docs[0].data() as Quiz;
    }
  } catch (err) {
    console.info('Quiz lookup via Firestore failed, checking local:', err);
  }
  const all = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
  return all.find(q => q.code.toUpperCase() === upper) || null;
}

export async function saveQuiz(quiz: Quiz): Promise<void> {
  const all = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
  const idx = all.findIndex(q => q.id === quiz.id);
  if (idx >= 0) all[idx] = quiz;
  else all.unshift(quiz);
  setLocal(LS_QUIZZES_KEY, all);

  try {
    await setDoc(doc(db, 'quizzes', quiz.id), quiz);
  } catch (err) {
    console.warn('Firestore quiz save error:', err);
  }
}

export async function updateQuizStatus(quizId: string, status: QuizStatus): Promise<void> {
  const all = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
  const quiz = all.find(q => q.id === quizId);
  if (quiz) {
    quiz.status = status;
    if (status === 'active') quiz.startedAt = new Date().toISOString();
    if (status === 'completed' || status === 'cancelled') quiz.endedAt = new Date().toISOString();
    setLocal(LS_QUIZZES_KEY, all);
  }

  try {
    const payload: Partial<Quiz> = { status };
    if (status === 'active') payload.startedAt = new Date().toISOString();
    if (status === 'completed' || status === 'cancelled') payload.endedAt = new Date().toISOString();
    await updateDoc(doc(db, 'quizzes', quizId), payload);
  } catch (err) {
    console.warn('Firestore quiz status update error:', err);
  }
}

export function subscribeToQuiz(quizId: string, callback: (quiz: Quiz | null) => void): () => void {
  try {
    const unsub = onSnapshot(doc(db, 'quizzes', quizId), snap => {
      if (snap.exists()) {
        callback(snap.data() as Quiz);
      }
    });
    return unsub;
  } catch {
    const timer = setInterval(() => {
      const all = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
      const found = all.find(q => q.id === quizId) || null;
      callback(found);
    }, 2000);
    return () => clearInterval(timer);
  }
}

// ================= ATTEMPTS (Auto-Save) =================
export async function saveAttempt(attempt: QuizAttempt): Promise<void> {
  attempt.lastSavedAt = new Date().toISOString();
  const all = getLocal<Record<string, QuizAttempt>>(LS_ATTEMPTS_KEY, {});
  all[attempt.id] = attempt;
  setLocal(LS_ATTEMPTS_KEY, all);

  try {
    await setDoc(doc(db, 'attempts', attempt.id), attempt);
  } catch (err) {
    // local save succeeded
  }
}

export async function fetchAttempt(attemptId: string): Promise<QuizAttempt | null> {
  try {
    const snap = await getDoc(doc(db, 'attempts', attemptId));
    if (snap.exists()) return snap.data() as QuizAttempt;
  } catch {}
  const all = getLocal<Record<string, QuizAttempt>>(LS_ATTEMPTS_KEY, {});
  return all[attemptId] || null;
}

// ================= RESULTS =================
export async function submitResult(result: QuizResult): Promise<void> {
  const all = getLocal<QuizResult[]>(LS_RESULTS_KEY, []);
  all.unshift(result);
  setLocal(LS_RESULTS_KEY, all);

  // Update quiz participant / submission count
  const quizzes = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
  const quiz = quizzes.find(q => q.id === result.quizId);
  if (quiz) {
    quiz.submissionCount = (quiz.submissionCount || 0) + 1;
    setLocal(LS_QUIZZES_KEY, quizzes);
  }

  try {
    await setDoc(doc(db, 'results', result.id), result);
    if (quiz) {
      await updateDoc(doc(db, 'quizzes', quiz.id), {
        submissionCount: quiz.submissionCount,
      });
    }
  } catch (err) {
    console.warn('Firestore result submission error:', err);
  }
}

export async function fetchResults(quizId?: string, studentId?: string): Promise<QuizResult[]> {
  try {
    const rCol = collection(db, 'results');
    let snap;
    if (quizId) snap = await getDocs(query(rCol, where('quizId', '==', quizId)));
    else if (studentId) snap = await getDocs(query(rCol, where('studentId', '==', studentId)));
    else snap = await getDocs(rCol);

    if (snap && !snap.empty) {
      const list: QuizResult[] = [];
      snap.forEach(d => list.push(d.data() as QuizResult));
      return list;
    }
  } catch (err) {
    console.info('Using local results cache:', err);
  }
  const all = getLocal<QuizResult[]>(LS_RESULTS_KEY, []);
  if (quizId) return all.filter(r => r.quizId === quizId);
  if (studentId) return all.filter(r => r.studentId === studentId);
  return all;
}

export function subscribeToQuizResults(quizId: string, callback: (results: QuizResult[]) => void): () => void {
  try {
    const q = query(collection(db, 'results'), where('quizId', '==', quizId));
    const unsub = onSnapshot(q, snap => {
      const list: QuizResult[] = [];
      snap.forEach(d => list.push(d.data() as QuizResult));
      callback(list);
    });
    return unsub;
  } catch {
    const timer = setInterval(() => {
      const all = getLocal<QuizResult[]>(LS_RESULTS_KEY, []);
      callback(all.filter(r => r.quizId === quizId));
    }, 2000);
    return () => clearInterval(timer);
  }
}

import { uploadMaterialFile } from '../utils/fileStore';

// ================= STUDY MATERIAL UPLOAD =================
export async function uploadStudyMaterial(
  file: File,
  topicId: string
): Promise<{ url: string; name: string; size: string; textPreview?: string }> {
  return uploadMaterialFile(file, topicId);
}

