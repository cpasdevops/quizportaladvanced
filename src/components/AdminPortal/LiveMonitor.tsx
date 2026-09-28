import React, { useState, useEffect } from 'react';
import { Quiz, QuizResult } from '../../types/quiz';
import { subscribeToQuizResults, updateQuizStatus } from '../../firebase/service';
import * as XLSX from 'xlsx';
import {
  Users,
  Trophy,
  Download,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Search,
  ChevronRight,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';

interface LiveMonitorProps {
  currentQuiz: Quiz | null;
  onRefresh: () => void;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({ currentQuiz, onRefresh }) => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedResult, setSelectedResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    if (!currentQuiz) {
      setResults([]);
      return;
    }

    const unsub = subscribeToQuizResults(currentQuiz.id, (list) => {
      setResults(list.sort((a, b) => b.score - a.score || a.timeTakenSeconds - b.timeTakenSeconds));
    });

    return () => unsub();
  }, [currentQuiz]);

  const exportToExcel = () => {
    if (results.length === 0) return;

    const data = results.map((r, i) => {
      const row: Record<string, any> = {
        Rank: i + 1,
        'Student Name': r.studentName,
        'Student Email': r.studentEmail,
        'Quiz Code': r.quizCode,
        'Quiz Title': r.quizTitle,
        'Score (out of 20)': r.score,
        'Percentage (%)': `${r.percentage}%`,
        'Correct Count': r.correctCount,
        'Incorrect Count': r.incorrectCount,
        'Unanswered Count': r.unansweredCount,
        'Time Taken (seconds)': r.timeTakenSeconds,
        'Time Taken (formatted)': `${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s`,
        'Submission Timestamp': new Date(r.submittedAt).toLocaleString(),
      };

      // Include question-by-question marks
      r.breakdown?.forEach((b, qIdx) => {
        row[`Q${qIdx + 1} Status`] = b.isCorrect ? 'Correct' : b.userSelectedOption === null ? 'Unanswered' : 'Incorrect';
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Results');
    XLSX.writeFile(workbook, `Quiz_Results_${currentQuiz?.code || 'Export'}.xlsx`);
  };

  if (!currentQuiz) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
        <Users className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">No Active Quiz Selected</h3>
        <p className="text-xs text-slate-400">
          Launch a quiz from the Quiz Control Center to view live incoming participants and submissions.
        </p>
      </div>
    );
  }

  const filteredResults = results.filter(
    (r) =>
      r.studentName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.studentEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const avgScore =
    results.length > 0
      ? (results.reduce((acc, curr) => acc + curr.score, 0) / results.length).toFixed(1)
      : '0.0';

  const avgPct =
    results.length > 0
      ? (results.reduce((acc, curr) => acc + curr.percentage, 0) / results.length).toFixed(0)
      : '0';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Live Monitor & Leaderboard</span>
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Code: {currentQuiz.code}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time participant updates and instant scoring records.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportToExcel}
            disabled={results.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Download Marks (Excel)</span>
          </button>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Submissions</div>
          <div className="text-2xl font-black text-white mt-1">{results.length}</div>
        </div>

        <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Average Score</div>
          <div className="text-2xl font-black text-emerald-400 mt-1">
            {avgScore} <span className="text-xs text-slate-500 font-normal">/ 20</span>
          </div>
        </div>

        <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Average Accuracy</div>
          <div className="text-2xl font-black text-indigo-400 mt-1">{avgPct}%</div>
        </div>

        <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-xl">
          <div className="text-[10px] text-slate-400 font-semibold uppercase">Session Status</div>
          <div className="text-sm font-extrabold text-amber-400 mt-2 flex items-center gap-1.5 uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            {currentQuiz.status}
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-4">
        <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter by student name or email..."
          className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
        />
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700">
            <tr>
              <th className="py-3 px-4">Rank</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Score</th>
              <th className="py-3 px-4">Accuracy</th>
              <th className="py-3 px-4">Breakdown (C / W / U)</th>
              <th className="py-3 px-4">Time Taken</th>
              <th className="py-3 px-4">Submitted</th>
              <th className="py-3 px-4 text-right">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredResults.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-500">
                  {results.length === 0
                    ? 'No submissions received yet. When students complete the quiz, results appear here automatically.'
                    : 'No matching student found.'}
                </td>
              </tr>
            ) : (
              filteredResults.map((r, idx) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4 font-mono font-bold">
                    {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-bold text-white">{r.studentName}</div>
                    <div className="text-[10px] text-slate-400">{r.studentEmail}</div>
                  </td>
                  <td className="py-3 px-4 font-mono font-black text-sm text-emerald-400">
                    {r.score} / 20
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        r.percentage >= 75
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : r.percentage >= 50
                          ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {r.percentage}%
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[11px] font-mono">
                    <span className="text-emerald-400">{r.correctCount}</span> /{' '}
                    <span className="text-rose-400">{r.incorrectCount}</span> /{' '}
                    <span className="text-slate-400">{r.unansweredCount}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-[11px] text-slate-300">
                    {Math.floor(r.timeTakenSeconds / 60)}m {r.timeTakenSeconds % 60}s
                  </td>
                  <td className="py-3 px-4 text-[10px] text-slate-400">
                    {new Date(r.submittedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedResult(r)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"
                      title="Inspect attempt breakdown"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Inspect Student Attempt Modal */}
      {selectedResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{selectedResult.studentName}</h3>
                <p className="text-xs text-slate-400">
                  {selectedResult.studentEmail} • Score: {selectedResult.score}/20 (
                  {selectedResult.percentage}%) • Time: {selectedResult.timeTakenSeconds}s
                </p>
              </div>
              <button
                onClick={() => setSelectedResult(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {selectedResult.breakdown?.map((b, i) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl border text-xs ${
                    b.isCorrect
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1 font-semibold">
                    <span>
                      Q{i + 1}: {b.questionText}
                    </span>
                    <span className="font-bold text-[10px] uppercase">
                      {b.isCorrect ? '✓ Correct' : b.userSelectedOption === null ? 'Unanswered' : '✗ Wrong'}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-1">
                    Student selected:{' '}
                    <span className="font-semibold">
                      {b.userSelectedOption !== null
                        ? `${String.fromCharCode(65 + b.userSelectedOption)}: ${b.options[b.userSelectedOption]}`
                        : 'None'}
                    </span>
                  </div>
                  {!b.isCorrect && (
                    <div className="text-[11px] text-emerald-300 font-semibold mt-0.5">
                      Correct answer: {String.fromCharCode(65 + b.correctOption)}: {b.options[b.correctOption]}
                    </div>
                  )}
                  {b.explanation && (
                    <div className="text-[10px] text-slate-400 mt-1.5 pt-1.5 border-t border-slate-700/50">
                      {b.explanation}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
