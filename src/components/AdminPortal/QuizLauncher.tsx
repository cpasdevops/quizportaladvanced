import React, { useState, useEffect } from 'react';
import { Quiz, Topic, Question } from '../../types/quiz';
import { saveQuiz, updateQuizStatus, removeQuiz } from '../../firebase/service';
import { QRCodeDisplay } from '../QRCodeDisplay';
import {
  Play,
  Square,
  Sparkles,
  QrCode,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Copy,
  ExternalLink,
  Flame,
  Radio,
  RotateCcw,
  Pause,
  Trash2,
  ListFilter,
  CheckCircle2,
  Calendar,
} from 'lucide-react';

interface QuizLauncherProps {
  currentQuiz: Quiz | null;
  quizzes?: Quiz[];
  topics: Topic[];
  questions: Question[];
  onQuizChange: (quiz: Quiz) => void;
  onRefresh: () => void;
  onGoToHistory?: (quizId?: string) => void;
}

export const QuizLauncher: React.FC<QuizLauncherProps> = ({
  currentQuiz,
  quizzes = [],
  topics,
  questions,
  onQuizChange,
  onRefresh,
  onGoToHistory,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState(
    currentQuiz?.topicId || topics[0]?.id || ''
  );
  const [quizTitle, setQuizTitle] = useState(
    currentQuiz?.title || topics[0]?.name || 'Live 20-Question Quiz'
  );
  const [timeLimit, setTimeLimit] = useState<number>(currentQuiz?.timeLimitMinutes || 20);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  // Sync title when topic selection changes
  useEffect(() => {
    if (selectedTopicId) {
      const top = topics.find((t) => t.id === selectedTopicId);
      if (top) setQuizTitle(top.name);
    }
  }, [selectedTopicId, topics]);

  const topicQuestions = questions.filter((q) => q.topicId === selectedTopicId);
  const approvedQuestions = topicQuestions.filter((q) => q.approved);
  const has20Approved = approvedQuestions.length >= 20;

  // Start an existing draft quiz session explicitly (Admin manual trigger only)
  const handleStartQuiz = async (quizId?: string) => {
    const targetId = quizId || currentQuiz?.id;
    if (!targetId) return;

    await updateQuizStatus(targetId, 'active');
    window.dispatchEvent(
      new CustomEvent('quiz-status-changed', {
        detail: { quizId: targetId, status: 'active' },
      })
    );
    onRefresh();
  };

  // Pause / Set back to draft
  const handlePauseToDraft = async (quizId?: string) => {
    const targetId = quizId || currentQuiz?.id;
    if (!targetId) return;

    await updateQuizStatus(targetId, 'draft');
    window.dispatchEvent(
      new CustomEvent('quiz-status-changed', {
        detail: { quizId: targetId, status: 'draft' },
      })
    );
    onRefresh();
  };

  // End or close an active quiz
  const handleEndQuiz = async (quizId?: string) => {
    const targetId = quizId || currentQuiz?.id;
    if (!targetId) return;

    if (confirm('End and close this quiz session? Students will no longer be able to start new attempts, and submissions will be saved to history.')) {
      await updateQuizStatus(targetId, 'completed');
      window.dispatchEvent(
        new CustomEvent('quiz-status-changed', {
          detail: { quizId: targetId, status: 'completed' },
        })
      );
      onRefresh();
    }
  };

  // Delete a quiz session
  const handleDeleteQuiz = async (quizId: string, title: string) => {
    if (confirm(`Delete session "${title}"? This will remove the session from live lists.`)) {
      await removeQuiz(quizId);
      onRefresh();
    }
  };

  // Create a brand new quiz session — ALWAYS CREATED IN DRAFT MODE
  const handleCreateNewQuiz = async () => {
    if (!has20Approved) {
      alert(
        `Cannot create quiz: this topic has ${approvedQuestions.length} approved questions. Exactly 20 are required.`
      );
      return;
    }

    const selected20 = approvedQuestions.slice(0, 20).map((q) => q.id);
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const topic = topics.find((t) => t.id === selectedTopicId);

    const newQuiz: Quiz = {
      id: 'quiz-' + Date.now(),
      code,
      title: quizTitle.trim() || topic?.name || 'Live 20-Question Quiz',
      topicId: selectedTopicId,
      topicName: topic?.name || 'General',
      status: 'draft', // STRICT RULE: Never start automatically. Saved in draft!
      totalQuestions: 20,
      timeLimitMinutes: Number(timeLimit) || 20,
      questionIds: selected20,
      participantCount: 0,
      submissionCount: 0,
      createdBy: 'admin-vidya',
      createdAt: new Date().toISOString(),
    };

    await saveQuiz(newQuiz);
    onQuizChange(newQuiz);
    setShowCreateForm(false);
    onRefresh();
  };

  const joinUrl = currentQuiz
    ? `${window.location.origin}/?code=${currentQuiz.code}&role=student`
    : '';

  const copyJoinUrl = () => {
    navigator.clipboard.writeText(joinUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const isLive = currentQuiz?.status === 'active';
  const isDraft = currentQuiz?.status === 'draft';
  const isCompleted = currentQuiz?.status === 'completed';

  return (
    <div className="space-y-6">
      {/* Top Banner & Session Switcher */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Live Quiz Control Center</h2>
            </div>
            <p className="text-xs text-slate-400">
              Admin starts the quiz strictly according to need. Sessions do not start automatically.
            </p>
          </div>

          {/* Quick Session Picker */}
          {quizzes.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-400 shrink-0">
                Manage Session:
              </label>
              <select
                value={currentQuiz?.id || ''}
                onChange={(e) => {
                  const found = quizzes.find((q) => q.id === e.target.value);
                  if (found) onQuizChange(found);
                }}
                className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
              >
                {quizzes.map((q) => (
                  <option key={q.id} value={q.id}>
                    [{q.code}] {q.title.slice(0, 24)}... ({q.status.toUpperCase()})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Selected Session Control Card */}
        {currentQuiz ? (
          <div className="flex flex-col lg:flex-row items-start justify-between gap-6 pt-4 border-t border-slate-800">
            {/* Left Column: Details & Primary Trigger */}
            <div className="flex-1 space-y-4 w-full">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-full border ${
                    isLive
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                      : isDraft
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {isLive
                    ? '● LIVE ACTIVE (RUNNING)'
                    : isDraft
                    ? '⏳ DRAFT — NOT STARTED YET'
                    : 'COMPLETED & ARCHIVED'}
                </span>

                <span className="text-xs text-slate-400">
                  Created: {new Date(currentQuiz.createdAt).toLocaleDateString()}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white">{currentQuiz.title}</h3>
                <p className="text-xs text-slate-300 mt-1">
                  Topic: <span className="text-indigo-300 font-semibold">{currentQuiz.topicName}</span> •{' '}
                  Strictly 20 Questions • {currentQuiz.timeLimitMinutes} min timer
                </p>
              </div>

              {/* Stats Box */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Session Code
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-indigo-300 tracking-widest mt-0.5">
                    {currentQuiz.code}
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Questions
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 tracking-wider mt-0.5">
                    20
                  </div>
                </div>

                <div className="p-3 bg-slate-800/80 rounded-2xl border border-slate-700/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Submissions
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-purple-400 tracking-wider mt-0.5">
                    {currentQuiz.submissionCount || 0}
                  </div>
                </div>
              </div>

              {/* Action Buttons: Strict Admin Control */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {/* When Draft: Admin explicitly clicks "Start Quiz Now" */}
                {isDraft && (
                  <button
                    type="button"
                    onClick={() => handleStartQuiz()}
                    className="flex-1 min-w-[200px] py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2 transform active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span>Start Quiz Now (Activate for Students)</span>
                  </button>
                )}

                {/* When Active: Admin can pause or end */}
                {isLive && (
                  <>
                    <button
                      type="button"
                      onClick={() => handlePauseToDraft()}
                      className="py-3 px-4 bg-amber-600/90 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/25 transition flex items-center gap-2"
                      title="Pause session and return students to waiting lobby"
                    >
                      <Pause className="w-4 h-4 fill-white" />
                      <span>Pause / Hold Session</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEndQuiz()}
                      className="py-3 px-5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/25 transition flex items-center gap-2"
                    >
                      <Square className="w-4 h-4 fill-white" />
                      <span>End / Close Quiz Session</span>
                    </button>
                  </>
                )}

                {/* When Completed: Admin can reset or reopen */}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={() => handlePauseToDraft()}
                    className="py-3 px-5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reopen Session (Set to Draft)</span>
                  </button>
                )}

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={copyJoinUrl}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-2"
                >
                  <Copy className="w-4 h-4 text-indigo-400" />
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Student Link'}</span>
                </button>
              </div>

              {/* Status Helper */}
              <div className="text-[11px] text-slate-400 bg-slate-950/70 p-3.5 rounded-xl border border-slate-800/80">
                {isDraft ? (
                  <p>
                    <strong className="text-amber-300">Ready in Draft:</strong> Students can join with code{' '}
                    <code className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                      {currentQuiz.code}
                    </code>{' '}
                    and wait in the lobby. The test will <strong>never start automatically</strong> until you click{' '}
                    <span className="text-emerald-300 font-bold">&quot;Start Quiz Now&quot;</span>.
                  </p>
                ) : isLive ? (
                  <p>
                    <strong className="text-emerald-300">Session is Live:</strong> Students are currently taking the 20-question test. Click &quot;End / Close Quiz Session&quot; when the test duration is complete.
                  </p>
                ) : (
                  <p>
                    <strong className="text-slate-300">Session Completed:</strong> All submissions are permanently saved to History.
                  </p>
                )}
              </div>
            </div>

            {/* Right Column: QR Code Display */}
            <div className="w-full lg:w-auto shrink-0 flex flex-col items-center">
              <QRCodeDisplay
                value={joinUrl}
                code={currentQuiz.code}
                title={`Join: ${currentQuiz.title.substring(0, 22)}...`}
                size={220}
              />
            </div>
          </div>
        ) : (
          <div className="py-8 text-center text-slate-400 text-xs">
            No quiz session selected. Create one below or select from history.
          </div>
        )}
      </div>

      {/* Form to Create New Session (Always Created as Draft) */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" />
            <h3 className="text-base font-bold text-white">Create New Quiz Session</h3>
          </div>
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="text-xs text-indigo-400 hover:text-indigo-300 font-bold"
          >
            {showCreateForm ? 'Hide Form' : '+ Setup Another Session'}
          </button>
        </div>

        {showCreateForm && (
          <div className="pt-2 space-y-4 border-t border-slate-800">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Select Topic (Must have at least 20 approved questions)
              </label>
              <select
                value={selectedTopicId}
                onChange={(e) => setSelectedTopicId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500 font-medium"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Quiz Title
              </label>
              <input
                type="text"
                value={quizTitle}
                onChange={(e) => setQuizTitle(e.target.value)}
                placeholder="Enter quiz title..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Question Count
                </label>
                <div className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-300 font-bold">
                  Strictly 20 Questions
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Time Limit (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Math.max(1, parseInt(e.target.value || '1', 10)))}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={handleCreateNewQuiz}
                disabled={!has20Approved}
                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2"
              >
                <span>Create Session in Draft Mode (Admin Starts When Ready)</span>
              </button>
              <p className="text-[11px] text-slate-400 text-center mt-2">
                The session will be saved in draft mode. It will <strong>never start automatically</strong>.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Complete Quiz Sessions History Table */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h3 className="text-base font-bold text-white">All Quiz Sessions History ({quizzes.length})</h3>
          </div>
          <span className="text-xs text-slate-400">All sessions permanently saved in database</span>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-800">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-800/90 text-slate-400 font-bold uppercase text-[10px] tracking-wider border-b border-slate-700">
              <tr>
                <th className="py-3 px-4">Session Code</th>
                <th className="py-3 px-4">Title & Topic</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Submissions</th>
                <th className="py-3 px-4">Created Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {quizzes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    No quiz sessions created yet.
                  </td>
                </tr>
              ) : (
                quizzes.map((q) => {
                  const isCurrent = currentQuiz?.id === q.id;
                  const isQActive = q.status === 'active';
                  const isQDraft = q.status === 'draft';

                  return (
                    <tr
                      key={q.id}
                      className={`hover:bg-slate-800/40 transition cursor-pointer ${
                        isCurrent ? 'bg-indigo-950/20' : ''
                      }`}
                      onClick={() => onQuizChange(q)}
                    >
                      <td className="py-3 px-4">
                        <span className="font-mono text-xs font-black text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">
                          {q.code}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-white leading-snug">{q.title}</div>
                        <div className="text-[11px] text-slate-400">{q.topicName}</div>
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
                          {isQActive ? 'Live Active' : isQDraft ? 'Draft' : 'Completed'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-purple-400">
                        {q.submissionCount || 0}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(q.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                          {isQDraft && (
                            <button
                              type="button"
                              onClick={() => handleStartQuiz(q.id)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold rounded-lg shadow transition flex items-center gap-1"
                              title="Start this quiz now"
                            >
                              <Play className="w-3 h-3 fill-white" />
                              <span>Start</span>
                            </button>
                          )}

                          {isQActive && (
                            <button
                              type="button"
                              onClick={() => handleEndQuiz(q.id)}
                              className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold rounded-lg shadow transition flex items-center gap-1"
                              title="End and close session"
                            >
                              <Square className="w-3 h-3 fill-white" />
                              <span>End</span>
                            </button>
                          )}

                          {q.status === 'completed' && (
                            <button
                              type="button"
                              onClick={() => handlePauseToDraft(q.id)}
                              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded-lg border border-slate-700 transition"
                              title="Re-open session as draft"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reopen</span>
                            </button>
                          )}

                          {q.id !== 'quiz-ethics-live' && (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuiz(q.id, q.title)}
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
      </div>
    </div>
  );
};
