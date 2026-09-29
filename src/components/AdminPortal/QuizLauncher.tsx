import React, { useState } from 'react';
import { Quiz, Topic, Question } from '../../types/quiz';
import { saveQuiz, updateQuizStatus } from '../../firebase/service';
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
} from 'lucide-react';

interface QuizLauncherProps {
  currentQuiz: Quiz | null;
  topics: Topic[];
  questions: Question[];
  onQuizChange: (quiz: Quiz) => void;
  onRefresh: () => void;
}

export const QuizLauncher: React.FC<QuizLauncherProps> = ({
  currentQuiz,
  topics,
  questions,
  onQuizChange,
  onRefresh,
}) => {
  const [selectedTopicId, setSelectedTopicId] = useState(
    currentQuiz?.topicId || topics[0]?.id || ''
  );
  const [quizTitle, setQuizTitle] = useState(
    currentQuiz?.title || 'Ethical Issues & Storytelling with Data in Generative AI'
  );
  const [timeLimit, setTimeLimit] = useState<number>(currentQuiz?.timeLimitMinutes || 15);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const topicQuestions = questions.filter((q) => q.topicId === selectedTopicId);
  const approvedQuestions = topicQuestions.filter((q) => q.approved);
  const has20Approved = approvedQuestions.length >= 20;

  // Start an existing draft quiz session explicitly
  const handleStartDraftQuiz = async () => {
    if (!currentQuiz) return;
    await updateQuizStatus(currentQuiz.id, 'active');
    window.dispatchEvent(
      new CustomEvent('quiz-status-changed', {
        detail: { quizId: currentQuiz.id, status: 'active' },
      })
    );
    onRefresh();
  };

  // End or close an active quiz
  const handleEndQuiz = async () => {
    if (!currentQuiz) return;
    if (confirm('Are you sure you want to end this active quiz? Student test submissions will close.')) {
      await updateQuizStatus(currentQuiz.id, 'completed');
      window.dispatchEvent(
        new CustomEvent('quiz-status-changed', {
          detail: { quizId: currentQuiz.id, status: 'completed' },
        })
      );
      onRefresh();
    }
  };

  // Reset to draft so admin can start it again
  const handleResetToDraft = async () => {
    if (!currentQuiz) return;
    await updateQuizStatus(currentQuiz.id, 'draft');
    window.dispatchEvent(
      new CustomEvent('quiz-status-changed', {
        detail: { quizId: currentQuiz.id, status: 'draft' },
      })
    );
    onRefresh();
  };

  // Create a brand new quiz session (starts in draft, requiring admin to press start)
  const handleCreateNewQuiz = async (startImmediately = false) => {
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
      status: startImmediately ? 'active' : 'draft',
      totalQuestions: 20,
      timeLimitMinutes: timeLimit,
      questionIds: selected20,
      participantCount: 0,
      submissionCount: 0,
      createdBy: 'admin-vidya',
      createdAt: new Date().toISOString(),
      startedAt: startImmediately ? new Date().toISOString() : undefined,
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
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
        {/* Left side: Quiz Controls & Status */}
        <div className="flex-1 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Flame className="w-5 h-5 text-amber-400" />
                <h2 className="text-xl font-bold text-white">Live Quiz Control Center</h2>
              </div>
              <p className="text-xs text-slate-400">
                Admin authoritative control: Quizzes only run when started by the admin.
              </p>
            </div>

            {currentQuiz && (
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
                  ? '⏳ WAITING FOR ADMIN TO START'
                  : 'COMPLETED'}
              </span>
            )}
          </div>

          {/* Current Session Control Box */}
          {currentQuiz && (
            <div
              className={`p-6 rounded-3xl border shadow-2xl space-y-5 transition ${
                isLive
                  ? 'bg-gradient-to-br from-indigo-950/70 via-slate-900 to-purple-950/50 border-indigo-500/50 shadow-indigo-950/40'
                  : isDraft
                  ? 'bg-gradient-to-br from-amber-950/40 via-slate-900 to-slate-900 border-amber-500/40 shadow-amber-950/20'
                  : 'bg-slate-800/40 border-slate-700/60'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div>
                  <span
                    className={`text-[10px] font-bold uppercase tracking-widest ${
                      isLive ? 'text-emerald-400' : isDraft ? 'text-amber-400' : 'text-slate-400'
                    }`}
                  >
                    {isLive
                      ? 'SESSION ACTIVE & IN PROGRESS'
                      : isDraft
                      ? 'SESSION CREATED — NOT STARTED YET'
                      : 'SESSION CLOSED'}
                  </span>
                  <h3 className="text-xl font-black text-white mt-1">{currentQuiz.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Topic: <span className="text-indigo-300 font-semibold">{currentQuiz.topicName}</span> •{' '}
                    Strictly 20 Questions • {currentQuiz.timeLimitMinutes} min timer
                  </p>
                </div>
              </div>

              {/* Stats & Session Code Banner */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Session Code
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-indigo-300 tracking-widest mt-0.5">
                    {currentQuiz.code}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80 text-center">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Questions
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 tracking-wider mt-0.5">
                    20
                  </div>
                </div>

                <div className="p-3 bg-slate-900/90 rounded-2xl border border-slate-700/80 text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                    Submissions
                  </div>
                  <div className="font-mono text-2xl sm:text-3xl font-black text-purple-400 tracking-wider mt-0.5">
                    {currentQuiz.submissionCount || 0}
                  </div>
                </div>
              </div>

              {/* Primary Action Buttons */}
              <div className="pt-2 flex flex-wrap items-center gap-3">
                {/* When Draft: Admin must click "Start Quiz Now" */}
                {isDraft && (
                  <button
                    type="button"
                    onClick={handleStartDraftQuiz}
                    className="flex-1 min-w-[200px] py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-black text-sm rounded-2xl shadow-xl shadow-emerald-600/30 transition flex items-center justify-center gap-2 transform active:scale-95"
                  >
                    <Play className="w-5 h-5 fill-white" />
                    <span>Start Quiz Now (Activate Session)</span>
                  </button>
                )}

                {/* When Active: Admin can End/Close */}
                {isLive && (
                  <button
                    type="button"
                    onClick={handleEndQuiz}
                    className="py-3 px-5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/25 transition flex items-center gap-2"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>End / Close Quiz Session</span>
                  </button>
                )}

                {/* When Completed: Admin can Reset to Draft or Restart */}
                {isCompleted && (
                  <button
                    type="button"
                    onClick={handleResetToDraft}
                    className="py-3 px-5 bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/25 transition flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    <span>Reset & Reopen as Draft</span>
                  </button>
                )}

                {/* Copy Link Button */}
                <button
                  type="button"
                  onClick={copyJoinUrl}
                  className="py-3 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition flex items-center gap-2"
                >
                  <Copy className="w-4 h-4 text-indigo-400" />
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Student Join Link'}</span>
                </button>
              </div>

              {/* Status Explanation Helper */}
              <div className="text-[11px] text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
                {isDraft ? (
                  <p>
                    <strong className="text-amber-300">Quiz is in Draft:</strong> Students who join using code{' '}
                    <code className="bg-slate-800 text-white px-1.5 py-0.5 rounded font-mono font-bold">
                      {currentQuiz.code}
                    </code>{' '}
                    will wait in the live waiting lobby. The assessment will only start when you click{' '}
                    <span className="text-emerald-300 font-bold">&quot;Start Quiz Now&quot;</span>.
                  </p>
                ) : isLive ? (
                  <p>
                    <strong className="text-emerald-300">Quiz is Live:</strong> Students can take the 20-question test now. Click &quot;End / Close Quiz Session&quot; when the test duration is complete.
                  </p>
                ) : (
                  <p>
                    <strong className="text-slate-300">Quiz has ended:</strong> No new attempts can be started. You can reset to draft or launch a new topic quiz below.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Toggle Create New Quiz Session Form */}
          <div className="pt-2">
            {!showCreateForm ? (
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>+ Launch Another 20-Question Quiz Session</span>
              </button>
            ) : (
              <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                    Create New Quiz Session
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select Topic (Must have at least 20 approved questions)
                  </label>
                  <select
                    value={selectedTopicId}
                    onChange={(e) => {
                      setSelectedTopicId(e.target.value);
                      const t = topics.find((top) => top.id === e.target.value);
                      if (t) setQuizTitle(t.name);
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500"
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
                    placeholder="Quiz title..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Question Count
                    </label>
                    <div className="bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-slate-300 font-bold">
                      Exactly 20 Questions
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Time Limit (Minutes)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      value={timeLimit}
                      onChange={(e) => setTimeLimit(Number(e.target.value))}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-indigo-500 font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleCreateNewQuiz(false)}
                    disabled={!has20Approved}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition"
                  >
                    Create as Draft (Wait to Start)
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCreateNewQuiz(true)}
                    disabled={!has20Approved}
                    className="flex-1 py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Launch & Start Now</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right side: QR Code Display for Live Projection */}
        <div className="w-full lg:w-auto shrink-0 flex flex-col items-center">
          {currentQuiz ? (
            <QRCodeDisplay
              value={joinUrl}
              code={currentQuiz.code}
              title={`Join: ${currentQuiz.title.substring(0, 22)}...`}
              size={230}
            />
          ) : (
            <div className="w-72 h-80 bg-slate-800/40 border border-slate-700/60 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <QrCode className="w-16 h-16 mb-3 opacity-40 text-indigo-400" />
              <p className="text-xs font-semibold text-slate-400">QR Code Display</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Select a topic on the left to project the QR code and session code.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
