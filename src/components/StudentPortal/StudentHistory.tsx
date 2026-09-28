import React, { useState, useEffect } from 'react';
import { QuizResult } from '../../types/quiz';
import { fetchResults } from '../../firebase/service';
import { useAuth } from '../../context/AuthContext';
import {
  History,
  Trophy,
  Calendar,
  Clock,
  ArrowLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
} from 'lucide-react';

interface StudentHistoryProps {
  onBackToJoin: () => void;
  onInspectResult: (result: QuizResult) => void;
}

export const StudentHistory: React.FC<StudentHistoryProps> = ({
  onBackToJoin,
  onInspectResult,
}) => {
  const { user } = useAuth();
  const [results, setResults] = useState<QuizResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentResults();
  }, [user]);

  const loadStudentResults = async () => {
    setLoading(true);
    const all = await fetchResults();
    // Filter by studentId if user exists or by name
    const myAttempts = user
      ? all.filter((r) => r.studentId === user.uid || r.studentName.toLowerCase() === user.displayName.toLowerCase())
      : all;
    setResults(myAttempts);
    setLoading(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToJoin}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition"
            title="Back to Join"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <History className="w-5 h-5 text-indigo-400" />
              <span>My Quiz History</span>
            </h1>
            <p className="text-xs text-slate-400">
              Candidate: <span className="text-indigo-300 font-semibold">{user?.displayName || 'Student'}</span> • {results.length} total attempt(s)
            </p>
          </div>
        </div>

        <button
          onClick={onBackToJoin}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
        >
          Join Active Quiz
        </button>
      </div>

      {/* History List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">Loading records from Firebase...</div>
        ) : results.length === 0 ? (
          <div className="p-12 text-center bg-slate-900/40 border border-slate-800 rounded-3xl">
            <Trophy className="w-12 h-12 text-slate-600 mx-auto mb-3" />
            <h3 className="text-base font-bold text-white mb-1">No Quiz Records Yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mb-4">
              You haven&apos;t completed any 20-question quizzes yet. Enter a session code or scan a host QR code to begin!
            </p>
            <button
              onClick={onBackToJoin}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition"
            >
              Join a Quiz Now
            </button>
          </div>
        ) : (
          results.map((r) => (
            <div
              key={r.id}
              onClick={() => onInspectResult(r)}
              className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-indigo-500/60 transition cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg group"
            >
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                    {r.quizCode}
                  </span>
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(r.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                <h3 className="font-bold text-white text-base group-hover:text-indigo-300 transition">
                  {r.quizTitle}
                </h3>

                <div className="flex items-center gap-4 text-xs text-slate-400 mt-2">
                  <span>
                    Topic: <span className="text-slate-300 font-medium">{r.topicName}</span>
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {Math.floor(r.timeTakenSeconds / 60)}m {r.timeTakenSeconds % 60}s
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-mono text-xl font-black text-emerald-400">
                    {r.score} <span className="text-xs text-slate-500 font-normal">/ 20</span>
                  </div>
                  <div className="text-[11px] font-bold text-indigo-400">
                    {r.percentage}% Score
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-slate-800 group-hover:bg-indigo-600 text-slate-400 group-hover:text-white transition">
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
