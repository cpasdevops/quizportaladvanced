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
import {
  getDatabase,
  ref as rtdbRef,
  set as rtdbSet,
  get as rtdbGet,
  update as rtdbUpdate,
  remove as rtdbRemove,
  onValue as rtdbOnValue,
} from 'firebase/database';
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
export const rtdb = getDatabase(app);
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

  // Background sync with Realtime Database (accessible by everyone across all browsers and devices)
  try {
    rtdbGet(rtdbRef(rtdb, 'topics')).then(snap => {
      if (snap.exists()) {
        const val = snap.val();
        const remoteList: Topic[] = Object.values(val);
        const mergedMap = new Map<string, Topic>();
        for (const t of getLocal<Topic[]>(LS_TOPICS_KEY, localList)) {
          mergedMap.set(t.id, t);
        }
        for (const r of remoteList) {
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
  } catch {}

  return localList;
}

export async function saveTopic(topic: Topic): Promise<void> {
  const current = getLocal<Topic[]>(LS_TOPICS_KEY, [SEED_TOPIC]);
  const idx = current.findIndex(t => t.id === topic.id);
  if (idx >= 0) current[idx] = topic;
  else current.unshift(topic);
  setLocal(LS_TOPICS_KEY, current);

  // Sync to Realtime Database so everyone on all devices sees the topic and its materials
  try {
    const clean = JSON.parse(JSON.stringify(topic));
    rtdbSet(rtdbRef(rtdb, `topics/${topic.id}`), clean).catch(() => {});
  } catch {}

  // Background cloud fallback
  setDoc(doc(db, 'topics', topic.id), topic).catch(() => {});
}

export async function removeTopic(topicId: string): Promise<void> {
  const current = getLocal<Topic[]>(LS_TOPICS_KEY, []);
  setLocal(LS_TOPICS_KEY, current.filter(t => t.id !== topicId));
  try {
    localStorage.removeItem(`qp_b64_mat_${topicId}`);
    rtdbRemove(rtdbRef(rtdb, `topics/${topicId}`)).catch(() => {});
    rtdbRemove(rtdbRef(rtdb, `materials/${topicId}`)).catch(() => {});
  } catch {}
  deleteDoc(doc(db, 'topics', topicId)).catch(() => {});
}

// ================= QUESTIONS =================
export async function fetchQuestions(topicId?: string): Promise<Question[]> {
  const all = getLocal<Question[]>(LS_QUESTIONS_KEY, SEED_QUESTIONS);

  // Sync from Realtime Database (accessible by everyone)
  try {
    rtdbGet(rtdbRef(rtdb, 'questions')).then(snap => {
      if (snap.exists()) {
        const val = snap.val();
        const remoteList: Question[] = Object.values(val);
        const map = new Map<string, Question>();
        for (const q of getLocal<Question[]>(LS_QUESTIONS_KEY, SEED_QUESTIONS)) {
          map.set(q.id, q);
        }
        for (const r of remoteList) {
          map.set(r.id, r);
        }
        setLocal(LS_QUESTIONS_KEY, Array.from(map.values()));
      }
    }).catch(() => {});
  } catch {}

  return topicId ? all.filter(q => q.topicId === topicId) : all;
}

export async function saveQuestion(question: Question): Promise<void> {
  const all = getLocal<Question[]>(LS_QUESTIONS_KEY, SEED_QUESTIONS);
  const idx = all.findIndex(q => q.id === question.id);
  if (idx >= 0) all[idx] = question;
  else all.push(question);
  setLocal(LS_QUESTIONS_KEY, all);

  try {
    const clean = JSON.parse(JSON.stringify(question));
    rtdbSet(rtdbRef(rtdb, `questions/${question.id}`), clean).catch(() => {});
  } catch {}

  setDoc(doc(db, 'questions', question.id), question).catch(() => {});
}

export async function saveQuestionsBatch(questions: Question[]): Promise<void> {
  const all = getLocal<Question[]>(LS_QUESTIONS_KEY, SEED_QUESTIONS);
  const map = new Map<string, Question>(all.map(q => [q.id, q]));
  for (const q of questions) {
    map.set(q.id, q);
  }
  setLocal(LS_QUESTIONS_KEY, Array.from(map.values()));

  // Sync all questions to Realtime Database so everyone on any device can access them
  try {
    const cleanList = JSON.parse(JSON.stringify(questions));
    for (const q of cleanList) {
      rtdbSet(rtdbRef(rtdb, `questions/${q.id}`), q).catch(() => {});
    }
  } catch {}

  // Background non-blocking fallback
  Promise.all(questions.map(q => setDoc(doc(db, 'questions', q.id), q).catch(() => {}))).catch(() => {});
}

export async function removeQuestion(questionId: string): Promise<void> {
  const all = getLocal<Question[]>(LS_QUESTIONS_KEY, []);
  setLocal(LS_QUESTIONS_KEY, all.filter(q => q.id !== questionId));
  try {
    rtdbRemove(rtdbRef(rtdb, `questions/${questionId}`)).catch(() => {});
  } catch {}
  deleteDoc(doc(db, 'questions', questionId)).catch(() => {});
}

// Broadcast key for instant cross-tab sync
export const LS_QUIZ_STATUS_BROADCAST = 'qp_broadcast_status_v1';

// Helper to clean undefined values before sending to Firestore
export function sanitizeForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined) {
      clean[k] = v;
    }
  }
  return clean;
}

// Helper to merge local and remote quizzes with local active priority
function mergeQuizzes(localList: Quiz[], remoteList: Quiz[]): Quiz[] {
  const map = new Map<string, Quiz>();
  // 1. Put remote first
  for (const r of remoteList) {
    if (r && r.id) map.set(r.id, r);
  }
  // 2. Local takes priority
  for (const l of localList) {
    if (!l || !l.id) continue;
    const rem = map.get(l.id);
    if (rem) {
      const isActive = l.status === 'active' || rem.status === 'active';
      const isCompleted = !isActive && (l.status === 'completed' || rem.status === 'completed');
      map.set(l.id, {
        ...rem,
        ...l,
        status: isActive ? 'active' : isCompleted ? 'completed' : l.status,
      });
    } else {
      map.set(l.id, l);
    }
  }
  return Array.from(map.values());
}

// ================= QUIZZES =================
export async function fetchQuizzes(): Promise<Quiz[]> {
  const localList = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);

  // Non-blocking background sync with Realtime Database (ultra-fast cross-device sync)
  try {
    rtdbGet(rtdbRef(rtdb, 'quizzes')).then(snap => {
      if (snap.exists()) {
        const val = snap.val();
        const remoteList: Quiz[] = Object.values(val);
        const currentLocal = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
        const merged = mergeQuizzes(currentLocal, remoteList);
        setLocal(LS_QUIZZES_KEY, merged);
      }
    }).catch(() => {});
  } catch {}

  // Fallback sync with Firestore
  getDocs(collection(db, 'quizzes'))
    .then(snap => {
      if (!snap.empty) {
        const remoteList: Quiz[] = [];
        snap.forEach(d => remoteList.push(d.data() as Quiz));
        const currentLocal = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
        const merged = mergeQuizzes(currentLocal, remoteList);
        setLocal(LS_QUIZZES_KEY, merged);
      }
    })
    .catch(() => {});

  return localList;
}

export async function fetchQuizByCode(code: string): Promise<Quiz | null> {
  const upper = code.trim().toUpperCase();
  const all = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
  const foundLocal = all.find(q => q.code && q.code.trim().toUpperCase() === upper);
  if (foundLocal) return foundLocal;

  // 1. Direct Realtime Database lookup by code (instant cross-device, works on mobile & Vercel!)
  try {
    const codeSnap = await rtdbGet(rtdbRef(rtdb, `quiz_codes/${upper}`));
    if (codeSnap.exists()) {
      const q = codeSnap.val() as Quiz;
      const cur = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
      if (!cur.some(item => item.id === q.id)) cur.unshift(q);
      setLocal(LS_QUIZZES_KEY, cur);
      return q;
    }

    // Scan all quizzes in RTDB
    const allSnap = await rtdbGet(rtdbRef(rtdb, 'quizzes'));
    if (allSnap.exists()) {
      const val = allSnap.val();
      for (const key of Object.keys(val)) {
        const q = val[key] as Quiz;
        if (q.code && q.code.trim().toUpperCase() === upper) {
          const cur = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
          if (!cur.some(item => item.id === q.id)) cur.unshift(q);
          setLocal(LS_QUIZZES_KEY, cur);
          return q;
        }
      }
    }
  } catch (err) {
    console.info('RTDB lookup error:', err);
  }

  // 2. Secondary Firestore query
  try {
    const qCol = collection(db, 'quizzes');
    const snap = await getDocs(query(qCol, where('code', '==', upper)));
    if (!snap.empty) {
      const q = snap.docs[0].data() as Quiz;
      const cur = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
      if (!cur.some(item => item.id === q.id)) cur.unshift(q);
      setLocal(LS_QUIZZES_KEY, cur);
      return q;
    }
  } catch (err) {
    console.info('Quiz lookup via Firestore failed:', err);
  }

  return null;
}

export async function saveQuiz(quiz: Quiz): Promise<void> {
  const all = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
  const idx = all.findIndex(q => q.id === quiz.id);
  if (idx >= 0) all[idx] = quiz;
  else all.unshift(quiz);
  setLocal(LS_QUIZZES_KEY, all);

  try {
    localStorage.setItem(LS_QUIZ_STATUS_BROADCAST, JSON.stringify({ quizId: quiz.id, status: quiz.status, t: Date.now() }));
    window.dispatchEvent(new CustomEvent('quiz-status-changed', { detail: { quizId: quiz.id, status: quiz.status } }));
  } catch {}

  const cleanData = JSON.parse(JSON.stringify(quiz));

  // 1. Save to Realtime Database (confirmed working across mobile and all origins!)
  try {
    rtdbSet(rtdbRef(rtdb, `quizzes/${quiz.id}`), cleanData).catch(() => {});
    if (quiz.code) {
      rtdbSet(rtdbRef(rtdb, `quiz_codes/${quiz.code.toUpperCase()}`), cleanData).catch(() => {});
    }
  } catch {}

  // 2. Non-blocking sync to Firestore with clean payload
  setDoc(doc(db, 'quizzes', quiz.id), cleanData, { merge: true }).catch(err => {
    console.warn('Firestore quiz save error:', err);
  });
}

export async function removeQuiz(quizId: string): Promise<void> {
  const all = getLocal<Quiz[]>(LS_QUIZZES_KEY, []);
  const quiz = all.find(q => q.id === quizId);
  setLocal(LS_QUIZZES_KEY, all.filter(q => q.id !== quizId));

  // Remove from RTDB
  try {
    rtdbRemove(rtdbRef(rtdb, `quizzes/${quizId}`)).catch(() => {});
    if (quiz?.code) {
      rtdbRemove(rtdbRef(rtdb, `quiz_codes/${quiz.code.toUpperCase()}`)).catch(() => {});
    }
  } catch {}

  deleteDoc(doc(db, 'quizzes', quizId)).catch(() => {});
  try {
    localStorage.setItem(LS_QUIZ_STATUS_BROADCAST, JSON.stringify({ quizId, deleted: true, t: Date.now() }));
    window.dispatchEvent(new CustomEvent('quiz-status-changed', { detail: { quizId, deleted: true } }));
  } catch {}
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

  // Cross-tab + same-window instant notifications
  try {
    localStorage.setItem(LS_QUIZ_STATUS_BROADCAST, JSON.stringify({ quizId, status, t: Date.now() }));
    window.dispatchEvent(new CustomEvent('quiz-status-changed', { detail: { quizId, status } }));
  } catch {}

  const payload: any = { status };
  if (status === 'active') payload.startedAt = new Date().toISOString();
  if (status === 'completed' || status === 'cancelled') payload.endedAt = new Date().toISOString();

  // 1. Update in Realtime Database (instant real-time push to mobile and all devices)
  try {
    rtdbUpdate(rtdbRef(rtdb, `quizzes/${quizId}`), payload).catch(() => {});
    if (quiz && quiz.code) {
      rtdbUpdate(rtdbRef(rtdb, `quiz_codes/${quiz.code.toUpperCase()}`), payload).catch(() => {});
    }
  } catch {}

  // 2. Sync to Firestore
  if (quiz) {
    const cleanData = JSON.parse(JSON.stringify(quiz));
    setDoc(doc(db, 'quizzes', quizId), cleanData, { merge: true }).catch(() => {});
  } else {
    setDoc(doc(db, 'quizzes', quizId), payload, { merge: true }).catch(() => {});
  }
}

/**
 * Real-time subscription for all quizzes (used by Student Portal to show live tests instantly)
 */
export function subscribeToAllQuizzes(callback: (quizzes: Quiz[]) => void): () => void {
  // 1. Immediate local emit (0ms)
  const initial = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
  callback(initial);

  // 2. Realtime Database onValue listener (WebSockets connection across all devices!)
  let unsubRTDB = () => {};
  try {
    const qRef = rtdbRef(rtdb, 'quizzes');
    unsubRTDB = rtdbOnValue(qRef, snap => {
      if (snap.exists()) {
        const val = snap.val();
        const remoteList: Quiz[] = Object.values(val);
        const currentLocal = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
        const merged = mergeQuizzes(currentLocal, remoteList);
        setLocal(LS_QUIZZES_KEY, merged);
        callback(merged);
      }
    }, err => {
      console.info('RTDB onValue notice:', err);
    });
  } catch {}

  // 3. Firestore listener fallback
  let unsubFirestore = () => {};
  try {
    unsubFirestore = onSnapshot(collection(db, 'quizzes'), snap => {
      if (!snap.empty) {
        const remoteList: Quiz[] = [];
        snap.forEach(d => remoteList.push(d.data() as Quiz));
        const currentLocal = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
        const merged = mergeQuizzes(currentLocal, remoteList);
        setLocal(LS_QUIZZES_KEY, merged);
        callback(merged);
      }
    }, () => {});
  } catch {}

  // 4. Local events handler
  const handleLocalChange = () => {
    const updated = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
    callback(updated);
  };

  window.addEventListener('storage', handleLocalChange);
  window.addEventListener('quiz-status-changed', handleLocalChange);

  // 5. Polling safeguard
  const timer = setInterval(handleLocalChange, 1000);

  return () => {
    unsubRTDB();
    unsubFirestore();
    window.removeEventListener('storage', handleLocalChange);
    window.removeEventListener('quiz-status-changed', handleLocalChange);
    clearInterval(timer);
  };
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

  const clean = JSON.parse(JSON.stringify(attempt));
  try {
    rtdbSet(rtdbRef(rtdb, `attempts/${attempt.id}`), clean).catch(() => {});
  } catch {}

  try {
    setDoc(doc(db, 'attempts', attempt.id), clean).catch(() => {});
  } catch (err) {
    // local save succeeded
  }
}

export async function fetchAttempt(attemptId: string): Promise<QuizAttempt | null> {
  try {
    const snap = await rtdbGet(rtdbRef(rtdb, `attempts/${attemptId}`));
    if (snap.exists()) return snap.val() as QuizAttempt;
  } catch {}
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

  // Update quiz participant / submission count locally
  const quizzes = getLocal<Quiz[]>(LS_QUIZZES_KEY, [SEED_QUIZ]);
  const quiz = quizzes.find(q => q.id === result.quizId);
  if (quiz) {
    quiz.submissionCount = (quiz.submissionCount || 0) + 1;
    setLocal(LS_QUIZZES_KEY, quizzes);
  }

  const cleanResult = JSON.parse(JSON.stringify(result));

  // 1. Save to Realtime Database (confirmed working cross-device)
  try {
    rtdbSet(rtdbRef(rtdb, `results/${result.id}`), cleanResult).catch(() => {});
    if (quiz) {
      rtdbUpdate(rtdbRef(rtdb, `quizzes/${quiz.id}`), { submissionCount: quiz.submissionCount }).catch(() => {});
      if (quiz.code) {
        rtdbUpdate(rtdbRef(rtdb, `quiz_codes/${quiz.code.toUpperCase()}`), { submissionCount: quiz.submissionCount }).catch(() => {});
      }
    }
  } catch {}

  // 2. Non-blocking sanitized sync to Firestore
  try {
    setDoc(doc(db, 'results', result.id), cleanResult).catch(() => {});
    if (quiz) {
      setDoc(doc(db, 'quizzes', quiz.id), { submissionCount: quiz.submissionCount }, { merge: true }).catch(() => {});
    }
  } catch (err) {
    console.warn('Firestore result submission error:', err);
  }
}

export async function fetchResults(quizId?: string, studentId?: string): Promise<QuizResult[]> {
  const local = getLocal<QuizResult[]>(LS_RESULTS_KEY, []);

  // Background non-blocking fetch from Realtime Database
  try {
    rtdbGet(rtdbRef(rtdb, 'results')).then(snap => {
      if (snap.exists()) {
        const val = snap.val();
        const list: QuizResult[] = Object.values(val);
        const curLocal = getLocal<QuizResult[]>(LS_RESULTS_KEY, []);
        const map = new Map<string, QuizResult>();
        for (const item of curLocal) map.set(item.id, item);
        for (const item of list) map.set(item.id, item);
        setLocal(LS_RESULTS_KEY, Array.from(map.values()));
      }
    }).catch(() => {});
  } catch {}

  if (quizId) return local.filter(r => r.quizId === quizId);
  if (studentId) return local.filter(r => r.studentId === studentId);
  return local;
}

export function subscribeToQuizResults(quizId: string, callback: (results: QuizResult[]) => void): () => void {
  // Listen via RTDB
  let unsubRTDB = () => {};
  try {
    unsubRTDB = rtdbOnValue(rtdbRef(rtdb, 'results'), snap => {
      if (snap.exists()) {
        const val = snap.val();
        const list: QuizResult[] = Object.values(val);
        callback(list.filter(r => r.quizId === quizId));
      }
    });
  } catch {}

  return () => {
    unsubRTDB();
  };
}

import { uploadMaterialFile } from '../utils/fileStore';

// ================= STUDY MATERIAL UPLOAD =================
export async function uploadStudyMaterial(
  file: File,
  topicId: string
): Promise<{ url: string; name: string; size: string; textPreview?: string }> {
  return uploadMaterialFile(file, topicId);
}

