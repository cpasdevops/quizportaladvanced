import React, { useState, useEffect } from 'react';
import { QuizResult, Quiz } from '../../types/quiz';
import { fetchResults, fetchQuizzes } from '../../firebase/service';
import * as XLSX from 'xlsx';
import {
  History,
  FileSpreadsheet,
  Search,
  Filter,
  Trophy,
  Calendar,
  CheckCircle,
  Eye,
  Clock,
} from 'lucide-react';

export const QuizHistoryAdmin: React.FC = () => {
  const [results, setResults] = useState<QuizResult[]>([]);
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [selectedQuizFilter, setSelectedQuizFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectResult, setInspectResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const allRes = await fetchResults();
    const allQuiz = await fetchQuizzes();
    setResults(allRes);
    setQuizzes(allQuiz);
  };

  const filtered = results.filter((r) => {
    const matchesQuiz = selectedQuizFilter === 'all' || r.quizId === selectedQuizFilter;
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.quizTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.quizCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuiz && matchesSearch;
  });

  const exportAllToExcel = () => {
    if (filtered.length === 0) return;

    const data = filtered.map((r, i) => {
      const row: Record<string, any> = {
        '#': i + 1,
        'Quiz Title': r.quizTitle,
        'Quiz Code': r.quizCode,
        'Topic Name': r.topicName,
        'Student Name': r.studentName,
        'Student Email': r.studentEmail,
        'Score / 20': r.score,
        'Percentage (%)': `${r.percentage}%`,
        'Correct Count': r.correctCount,
        'Incorrect Count': r.incorrectCount,
        'Unanswered Count': r.unansweredCount,
        'Time Taken (s)': r.timeTakenSeconds,
        'Time Taken (formatted)': `${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s`,
        'Submitted At': new Date(r.submittedAt).toLocaleString(),
      };

      r.breakdown?.forEach((b, qIdx) => {
        row[`Q${qIdx + 1}`] = b.isCorrect
          ? 'Correct'
          : b.userSelectedOption === null
          ? 'Unanswered'
          : 'Incorrect';
      });

      return row;
    });

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Master Quiz History');
    XLSX.writeFile(workbook, `QuizPortal_Master_History_${Date.now()}.xlsx`);
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Complete Quiz Records & History</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Permanent Firebase audit log of all completed student assessments and marks.
          </p>
        </div>

        <button
          onClick={exportAllToExcel}
          disabled={filtered.length === 0}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition"
        >
          <FileSpreadsheet className="w-4 h-4" />
          <span>Export Master Excel</span>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by student, email, code or quiz..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={selectedQuizFilter}
            onChange={(e) => setSelectedQuizFilter(e.target.value)}
            className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
          >
            <option value="all">All Quizzes</option>
            {quizzes.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title} ({q.code})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Historical Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-800/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700">
            <tr>
              <th className="py-3 px-4">Quiz Session</th>
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Score (out of 20)</th>
              <th className="py-3 px-4">Percentage</th>
              <th className="py-3 px-4">Correct / Wrong / Blank</th>
              <th className="py-3 px-4">Duration</th>
              <th className="py-3 px-4">Date</th>
              <th className="py-3 px-4 text-right">Review</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-10 text-center text-slate-500">
                  No historical attempts recorded yet.
                </td>
              </tr>
            ) : (
              filtered.map((r) => (
                <tr key={r.id} className="hover:bg-slate-800/40 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-white line-clamp-1">{r.quizTitle}</div>
                    <div className="text-[10px] font-mono text-indigo-400">Code: {r.quizCode}</div>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-semibold text-white">{r.studentName}</div>
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
                  <td className="py-3 px-4 font-mono text-[11px]">
                    <span className="text-emerald-400 font-bold">{r.correctCount}</span> /{' '}
                    <span className="text-rose-400 font-bold">{r.incorrectCount}</span> /{' '}
                    <span className="text-slate-400">{r.unansweredCount}</span>
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400 text-[11px]">
                    {Math.floor(r.timeTakenSeconds / 60)}m {r.timeTakenSeconds % 60}s
                  </td>
                  <td className="py-3 px-4 text-[10px] text-slate-400">
                    {new Date(r.submittedAt).toLocaleDateString()}{' '}
                    {new Date(r.submittedAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setInspectResult(r)}
                      className="p-1.5 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition"
                      title="Inspect attempt details"
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

      {/* Inspect Modal */}
      {inspectResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{inspectResult.studentName}</h3>
                <p className="text-xs text-slate-400">
                  {inspectResult.quizTitle} • Score: {inspectResult.score} / 20 ({inspectResult.percentage}%)
                </p>
              </div>
              <button
                onClick={() => setInspectResult(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {inspectResult.breakdown?.map((b, i) => (
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
                        : 'Unanswered'}
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
