import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { fetchQuizByCode } from '../../firebase/service';
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

  // Check URL params for auto-filled code (e.g. scanned from another camera)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const codeParam = params.get('code');
    if (codeParam) {
      setQuizCode(codeParam.toUpperCase());
    }
  }, []);

  const handleJoin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setError(null);

    const nameToUse = studentName.trim();
    const codeToUse = quizCode.trim().toUpperCase();

    if (!nameToUse) {
      setError('Please enter your full name to join the quiz.');
      return;
    }
    if (!codeToUse) {
      setError('Please enter the 6-character Quiz Code or scan the QR Code.');
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
        setError('This quiz session has already ended. Ask the host to start a new quiz session.');
        setIsLoading(false);
        return;
      }

      if (quiz.status === 'draft') {
        setError('This quiz is still in draft state. The host has not started it yet.');
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
    setQuizCode(scannedCode.toUpperCase());
    // Auto submit if name is already provided
    if (studentName.trim()) {
      setTimeout(() => {
        handleJoin();
      }, 100);
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-60 h-60 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-60 h-60 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-indigo-500/25">
              <GraduationCap className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Join Live Quiz
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
              Scan the host&apos;s QR code or enter your 6-character session code to receive your randomized 20 questions.
            </p>
          </div>

          {/* Quick Demo Fill Button */}
          <div className="flex justify-center mb-6">
            <button
              type="button"
              onClick={() => {
                setStudentName('Alex Morgan');
                setStudentEmail('alex.m@university.edu');
                setQuizCode('ETH2026');
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold rounded-full border border-slate-700 transition"
            >
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Fill Demo Details (Code: ETH2026)</span>
            </button>
          </div>

          {/* Join Form */}
          <form onSubmit={handleJoin} className="space-y-4">
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
                placeholder="e.g. Maya Chen"
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
                placeholder="e.g. maya@student.edu"
                className="w-full bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Session Code *</span>
                </span>
                <span className="text-[11px] font-normal text-indigo-400">Ask host or teacher</span>
              </label>

              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  maxLength={8}
                  value={quizCode}
                  onChange={(e) => setQuizCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ETH2026"
                  className="flex-1 bg-slate-800/90 border border-slate-700 rounded-xl px-4 py-3 text-base text-white font-mono font-bold tracking-widest uppercase placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition text-center"
                />

                <button
                  type="button"
                  onClick={() => setIsScannerOpen(true)}
                  className="flex items-center gap-1.5 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
                  title="Open Camera QR Scanner"
                >
                  <QrCode className="w-4 h-4 text-indigo-400" />
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
              className="w-full py-3.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 mt-2"
            >
              <span>{isLoading ? 'Verifying Session...' : 'Enter Quiz Lobby'}</span>
              <ArrowRight className="w-4 h-4" />
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
