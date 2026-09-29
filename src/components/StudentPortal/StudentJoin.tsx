import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchQuizByCode, subscribeToAllQuizzes } from '../../firebase/service';
import { Quiz } from '../../types/quiz';
import { QRScannerModal } from '../QRScannerModal';
import {
  GraduationCap,
  QrCode,
  ArrowRight,
  AlertCircle,
  Sparkles,
  User,
  Hash,
  CheckCircle2,
  Clock,
  BookOpen,
  Radio,
  Flame,
  KeyRound,
  ExternalLink,
} from 'lucide-react';

interface StudentJoinProps {
  onJoinSuccess: (quiz: Quiz, studentName: string, studentEmail?: string) => void;
  onGoToHistory: () => void;
}

export const StudentJoin: React.FC<StudentJoinProps> = ({
  onJoinSuccess,
  onGoToHistory,
}) => {
  const { user, loginAsStudent } = useAuth();
  const [studentName, setStudentName] = useState(user?.displayName || '');
  const [studentEmail, setStudentEmail] = useState(user?.email || '');
  const [quizCode, setQuizCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [liveQuizzes, setLiveQuizzes] = useState<Quiz[]>([]);

  // Check URL params for auto-filled code (e.g. scanned from QR link)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setQuizCode(codeParam.toUpperCase());
    }

    // Subscribe to all quizzes with realtime Firestore snapshot + cross-tab localStorage broadcast
    const unsubscribe = subscribeToAllQuizzes((allQuizzes) => {
      const onlyLive = allQuizzes.filter((q) => q.status === 'active');
      setLiveQuizzes(onlyLive);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleJoin = async (overrideCode?: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const nameToUse = studentName.trim();
    const codeToUse = (overrideCode || quizCode).trim().toUpperCase();

    if (!nameToUse) {
      setError('Please enter your full name to join the quiz.');
      return;
    }
    if (!codeToUse) {
      setError('Please enter the session code or scan the QR code.');
      return;
    }

    setIsLoading(true);

    try {
      const quiz = await fetchQuizByCode(codeToUse);

      if (!quiz) {
        setError(`Quiz with code "${codeToUse}" was not found. Please check with your teacher or host.`);
        setIsLoading(false);
        return;
      }

      if (quiz.status === 'completed' || quiz.status === 'cancelled') {
        setError('This quiz session has already ended. It is no longer accepting submissions.');
        setIsLoading(false);
        return;
      }

      // Strictly enforce that the quiz MUST be live (active)
      if (quiz.status !== 'active') {
        setError(`Quiz session "${codeToUse}" is not live yet. Please wait for your teacher or admin to start the test.`);
        setIsLoading(false);
        return;
      }

      // Save student identity in Auth context
      await loginAsStudent(nameToUse, studentEmail);

      setIsLoading(false);
      onJoinSuccess(quiz, nameToUse, studentEmail);
    } catch (err: any) {
      setError(`Error connecting to quiz: ${err.message || 'Unknown network error'}`);
      setIsLoading(false);
    }
  };

  const handleScanSuccess = (scannedCode: string) => {
    setIsScannerOpen(false);
    const upper = scannedCode.toUpperCase();
    setQuizCode(upper);
    if (studentName.trim()) {
      handleJoin(upper);
    }
  };

  const quickJoin = (code: string) => {
    setQuizCode(code);
    if (studentName.trim()) {
      handleJoin(code);
    }
  };

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      {/* SHOW ONLY LIVE TESTS TO STUDENTS */}
      {liveQuizzes.length > 0 ? (
        <div className="bg-slate-900/90 border border-emerald-500/50 rounded-3xl p-6 shadow-2xl shadow-emerald-950/20 backdrop-blur-xl relative overflow-hidden">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <h2 className="text-base font-extrabold text-white flex items-center gap-2">
                <Radio className="w-5 h-5 text-emerald-400" />
                <span>Live Active Tests ({liveQuizzes.length})</span>
              </h2>
            </div>
            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
              ● Live Now
            </span>
          </div>

          <div className="space-y-3">
            {liveQuizzes.map((q) => (
              <div
                key={q.id}
                className="p-4 rounded-2xl border bg-gradient-to-r from-emerald-950/40 via-indigo-950/30 to-slate-900 border-emerald-500/50 shadow-lg shadow-emerald-900/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:border-emerald-400"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse">
                      ● Live Active
                    </span>
                    <span className="text-xs text-slate-300">
                      Topic: <span className="text-white font-semibold">{q.topicName}</span>
                    </span>
                  </div>

                  <h3 className="font-extrabold text-white text-base leading-snug">
                    {q.title}
                  </h3>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    {q.totalQuestions || 20} Questions • {q.timeLimitMinutes} minutes
                  </div>
                </div>

                {/* Session Code Badge & Quick Join Button */}
                <div className="flex items-center gap-2 sm:self-center shrink-0">
                  <div className="bg-slate-900/90 border border-slate-700/80 px-3.5 py-1.5 rounded-xl text-center">
                    <div className="text-[9px] uppercase font-bold text-slate-400">Code</div>
                    <div className="font-mono text-base font-black text-emerald-300 tracking-wider">
                      {q.code}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => quickJoin(q.code)}
                    className="px-4 py-2.5 text-xs font-bold rounded-xl shadow-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30 transition flex items-center gap-1.5 transform active:scale-95"
                  >
                    <span>Join Test</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl p-4 text-center">
          <p className="text-xs text-slate-400 flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-slate-600" />
            <span>No live tests currently running. When your teacher starts a quiz session, it will automatically appear here.</span>
          </p>
        </div>
      )}

      {/* Main Join Form */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Ambient glow */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-3 shadow-xl shadow-indigo-500/25">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Student Quiz Portal
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Scan the projected QR Code with your camera or enter the live Session Code below.
            </p>
          </div>

          {/* Join Form */}
          <form onSubmit={(e) => handleJoin(undefined, e)} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Your Full Name *</span>
              </label>
              <input
                type="text"
                required
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                placeholder="e.g. Alex Morgan"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Student Email (Optional)
              </label>
              <input
                type="email"
                value={studentEmail}
                onChange={(e) => setStudentEmail(e.target.value)}
                placeholder="e.g. alex@student.edu"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Session Code *</span>
                </span>
                <span className="text-[11px] font-mono text-emerald-400">Must be live</span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  maxLength={10}
                  value={quizCode}
                  onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                  placeholder="ENTER LIVE SESSION CODE"
                  className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-base text-white font-mono font-black tracking-widest uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-center"
                />

                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center gap-2 px-4 py-3 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 hover:text-white text-xs font-bold rounded-xl border border-indigo-500/40 transition shrink-0"
                  title="Open Camera to scan QR Code"
                >
                  <QrCode className="w-5 h-5 text-indigo-400" />
                  <span className="hidden sm:inline">Scan QR</span>
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/50 border border-rose-800/80 rounded-xl flex items-center gap-2 text-rose-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !studentName.trim() || !quizCode.trim()}
              className="w-full py-3.5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 mt-2"
            >
              <span>{isLoading ? 'Connecting to Test...' : 'Enter Live Test →'}</span>
            </button>
          </form>

          {/* Previous attempts link */}
          <div className="mt-6 pt-6 border-t border-slate-800/80 text-center">
            <button
              onClick={onGoToHistory}
              className="text-xs text-slate-400 hover:text-indigo-400 font-medium transition"
            >
              View My Previous Quiz Attempts & Marks →
            </button>
          </div>
        </div>
      </div>

      {/* QR Scanner Modal */}
      <QRScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />
    </div>
  );
};
