import React, { useState, useEffect } from 'react';
import { QuizResult, Quiz } from '../../types/quiz';
import { fetchResults, fetchQuizzes, updateQuizStatus, removeQuiz } from '../../firebase/service';
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
  Download,
  Users,
  Award,
  Play,
  Square,
  RotateCcw,
  Trash2,
  Layers,
  FileText,
  CheckCircle2,
  XCircle,
} from 'lucide-react';

export const QuizHistoryAdmin: React.FC = () => {
  const [historyTab, setHistoryTab] = useState<'submissions' | 'sessions'>('sessions');
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

  const filteredResults = results.filter((r) => {
    const matchesQuiz = selectedQuizFilter === 'all' || r.quizId === selectedQuizFilter;
    const matchesSearch =
      r.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.studentEmail.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.quizTitle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.quizCode.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesQuiz && matchesSearch;
  });

  const filteredSessions = quizzes.filter((q) => {
    const matchesSearch =
      q.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.topicName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      q.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  // Export to Excel
  const exportAllToExcel = () => {
    if (filteredResults.length === 0) {
      alert('No submission records to export.');
      return;
    }

    const data = filteredResults.map((r, i) => {
      const row: Record<string, any> = {
        '#': i + 1,
        'Quiz Title': r.quizTitle,
        'Session Code': r.quizCode,
        'Topic Name': r.topicName,
        'Student Name': r.studentName,
        'Student Email': r.studentEmail,
        'Score / 20': r.score,
        'Percentage (%)': `${r.percentage}%`,
        'Passed': r.percentage >= 50 ? 'PASS' : 'FAIL',
        'Correct Count': r.correctCount,
        'Incorrect Count': r.incorrectCount,
        'Unanswered Count': r.unansweredCount,
        'Time Taken (seconds)': r.timeTakenSeconds,
        'Duration': `${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s`,
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
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Student Submissions');
    XLSX.writeFile(workbook, `Quiz_Submissions_History_${Date.now()}.xlsx`);
  };

  // Export to CSV
  const exportToCsv = () => {
    if (filteredResults.length === 0) {
      alert('No submission records to export.');
      return;
    }

    const headers = ['#', 'Student Name', 'Student Email', 'Session Code', 'Topic', 'Score (out of 20)', 'Percentage', 'Duration', 'Submitted At'];
    const rows = filteredResults.map((r, i) => [
      i + 1,
      `"${r.studentName}"`,
      `"${r.studentEmail}"`,
      `"${r.quizCode}"`,
      `"${r.topicName}"`,
      r.score,
      `"${r.percentage}%"`,
      `"${Math.floor(r.timeTakenSeconds / 60)}m ${r.timeTakenSeconds % 60}s"`,
      `"${new Date(r.submittedAt).toLocaleString()}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Quiz_Results_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Controls for sessions from history
  const handleToggleSessionStatus = async (quizId: string, newStatus: 'active' | 'draft' | 'completed') => {
    await updateQuizStatus(quizId, newStatus);
    window.dispatchEvent(
      new CustomEvent('quiz-status-changed', {
        detail: { quizId, status: newStatus },
      })
    );
    loadData();
  };

  const handleDeleteSession = async (quizId: string, title: string) => {
    if (confirm(`Permanently delete quiz session "${title}"?`)) {
      await removeQuiz(quizId);
      loadData();
    }
  };

  // Quick statistics
  const avgScore =
    results.length > 0
      ? (results.reduce((acc, r) => acc + r.percentage, 0) / results.length).toFixed(1)
      : '0';

  const passRate =
    results.length > 0
      ? ((results.filter((r) => r.percentage >= 60).length / results.length) * 100).toFixed(0)
      : '0';

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-400" />
            <span>Audit History & Results Hub</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Permanent database history of all quiz sessions, candidate scores, and exportable logs.
          </p>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={exportToCsv}
            disabled={results.length === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
            title="Download CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>CSV</span>
          </button>

          <button
            onClick={exportAllToExcel}
            disabled={results.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/20 transition"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Export to Excel (.xlsx)</span>
          </button>
        </div>
      </div>

      {/* Overview Stat Widgets */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/60 text-center">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Total Sessions</div>
          <div className="font-mono text-2xl font-black text-indigo-400 mt-0.5">
            {quizzes.length}
          </div>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/60 text-center">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Total Submissions</div>
          <div className="font-mono text-2xl font-black text-purple-400 mt-0.5">
            {results.length}
          </div>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/60 text-center">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Average Score</div>
          <div className="font-mono text-2xl font-black text-emerald-400 mt-0.5">
            {avgScore}%
          </div>
        </div>

        <div className="p-3 bg-slate-800/50 rounded-2xl border border-slate-700/60 text-center">
          <div className="text-[10px] text-slate-400 font-bold uppercase">Pass Rate (≥60%)</div>
          <div className="font-mono text-2xl font-black text-amber-400 mt-0.5">
            {passRate}%
          </div>
        </div>
      </div>

      {/* History Sub-View Tabs: Sessions vs Student Submissions */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800 pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setHistoryTab('sessions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              historyTab === 'sessions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>Quiz Sessions History ({quizzes.length})</span>
          </button>

          <button
            onClick={() => setHistoryTab('submissions')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
              historyTab === 'submissions'
                ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Student Test Submissions ({results.length})</span>
          </button>
        </div>

        {/* Global Search Box */}
        <div className="relative max-w-xs w-full hidden sm:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search code, title, student..."
            className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* TAB 1: ALL QUIZ SESSIONS HISTORY */}
      {historyTab === 'sessions' && (
        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Session Code</th>
                <th className="py-3 px-4">Title & Topic</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Questions</th>
                <th className="py-3 px-4">Submissions</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500">
                    No matching quiz sessions found in history.
                  </td>
                </tr>
              ) : (
                filteredSessions.map((q) => {
                  const isQActive = q.status === 'active';
                  const isQDraft = q.status === 'draft';

                  return (
                    <tr key={q.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded">
                          {q.code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white">{q.title}</div>
                        <div className="text-[11px] text-slate-400">Topic: {q.topicName}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                            isQActive
                              ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                              : isQDraft
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                              : 'bg-slate-700 text-slate-400 border-slate-600'
                          }`}
                        >
                          {isQActive ? 'Live Active' : isQDraft ? 'Draft (Not Started)' : 'Completed'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-semibold text-slate-300">
                        {q.totalQuestions || 20}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-400">
                        {q.submissionCount || 0}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* If draft: manual start */}
                          {isQDraft && (
                            <button
                              type="button"
                              onClick={() => handleToggleSessionStatus(q.id, 'active')}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow transition flex items-center gap-1"
                              title="Start session now"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Start</span>
                            </button>
                          )}

                          {/* If active: close */}
                          {isQActive && (
                            <button
                              type="button"
                              onClick={() => handleToggleSessionStatus(q.id, 'completed')}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg shadow transition flex items-center gap-1"
                              title="Close session"
                            >
                              <Square className="w-3 h-3 fill-white" />
                              <span>Close</span>
                            </button>
                          )}

                          {/* Reopen as draft */}
                          {q.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => handleToggleSessionStatus(q.id, 'draft')}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition"
                              title="Re-open session"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reopen</span>
                            </button>
                          )}

                          {/* View submissions filter */}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedQuizFilter(q.id);
                              setHistoryTab('submissions');
                            }}
                            className="px-2 py-1 bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 text-[10px] font-bold rounded-lg border border-indigo-500/40 transition"
                            title="Filter student results for this session"
                          >
                            Scores ({q.submissionCount || 0})
                          </button>

                          {q.id !== 'quiz-ethics-live' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteSession(q.id, q.title)}
                              className="p-1 text-slate-500 hover:text-rose-400 hover:bg-slate-800 rounded transition"
                              title="Delete session"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB 2: STUDENT TEST SUBMISSIONS */}
      {historyTab === 'submissions' && (
        <div className="space-y-4">
          {/* Quiz Filter Selector */}
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-bold text-slate-300">Filter by Session:</span>
            <select
              value={selectedQuizFilter}
              onChange={(e) => setSelectedQuizFilter(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 max-w-sm truncate"
            >
              <option value="all">All Quiz Sessions ({results.length} total submissions)</option>
              {quizzes.map((q) => (
                <option key={q.id} value={q.id}>
                  [{q.code}] {q.title}
                </option>
              ))}
            </select>
          </div>

          {/* Submissions Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-800">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700">
                <tr>
                  <th className="py-3 px-4">Session Code</th>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Score (out of 20)</th>
                  <th className="py-3 px-4">Percentage</th>
                  <th className="py-3 px-4">Correct / Wrong / Skip</th>
                  <th className="py-3 px-4">Duration</th>
                  <th className="py-3 px-4">Date & Time</th>
                  <th className="py-3 px-4 text-right">Inspect Scorecard</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredResults.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-10 text-center text-slate-500">
                      No candidate test submissions recorded yet for this filter.
                    </td>
                  </tr>
                ) : (
                  filteredResults.map((r) => (
                    <tr key={r.id} className="hover:bg-slate-800/40 transition">
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                          {r.quizCode}
                        </span>
                        <div className="text-[10px] text-slate-400 truncate max-w-[120px] mt-0.5">
                          {r.topicName}
                        </div>
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
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition text-xs font-semibold flex items-center gap-1 ml-auto border border-slate-700"
                          title="Inspect attempt details"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Review</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Student Scorecard Modal */}
      {inspectResult && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
            <div className="flex items-start justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-base font-bold text-white">{inspectResult.studentName}</h3>
                <p className="text-xs text-slate-400">
                  {inspectResult.quizTitle} • Score: {inspectResult.score} / 20 ({inspectResult.percentage}%) • Session Code: {inspectResult.quizCode}
                </p>
              </div>
              <button
                onClick={() => setInspectResult(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-1">
              {inspectResult.breakdown?.map((b, i) => (
                <div
                  key={i}
                  className={`p-3.5 rounded-2xl border text-xs ${
                    b.isCorrect
                      ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-200'
                      : 'bg-rose-950/30 border-rose-500/40 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5 font-semibold">
                    <span>
                      Q{i + 1}: {b.questionText}
                    </span>
                    <span className="font-bold text-[10px] uppercase">
                      {b.isCorrect ? '✓ Correct (+1)' : b.userSelectedOption === null ? 'Skipped (0)' : '✗ Incorrect (0)'}
                    </span>
                  </div>
                  <div className="text-[11px] opacity-80 mt-1">
                    Student answer:{' '}
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
                      <strong>Explanation:</strong> {b.explanation}
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
