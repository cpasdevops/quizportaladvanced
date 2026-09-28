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

  const topicQuestions = questions.filter((q) => q.topicId === selectedTopicId);
  const approvedQuestions = topicQuestions.filter((q) => q.approved);
  const has20Approved = approvedQuestions.length >= 20;

  const handleLaunchQuiz = async () => {
    if (!has20Approved) {
      alert(`Cannot start quiz: this topic has ${approvedQuestions.length} approved questions. Exactly 20 are required.`);
      return;
    }

    // Pick exactly 20 questions
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
      status: 'active',
      totalQuestions: 20,
      timeLimitMinutes: timeLimit,
      questionIds: selected20,
      participantCount: 0,
      submissionCount: 0,
      createdBy: 'admin-vidya',
      createdAt: new Date().toISOString(),
      startedAt: new Date().toISOString(),
    };

    await saveQuiz(newQuiz);
    onQuizChange(newQuiz);
    onRefresh();
  };

  const handleEndQuiz = async () => {
    if (!currentQuiz) return;
    if (confirm('Are you sure you want to end this active quiz? Students will not be able to start new attempts.')) {
      await updateQuizStatus(currentQuiz.id, 'completed');
      onRefresh();
    }
  };

  const handleReactivate = async () => {
    if (!currentQuiz) return;
    await updateQuizStatus(currentQuiz.id, 'active');
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

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      <div className="flex flex-col lg:flex-row items-start justify-between gap-6">
        {/* Left side: Quiz Configuration & Live Controls */}
        <div className="flex-1 space-y-6 w-full">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Flame className="w-5 h-5 text-amber-400" />
              <h2 className="text-xl font-bold text-white">Live Quiz Control Center</h2>
              {currentQuiz && (
                <span
                  className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                    currentQuiz.status === 'active'
                      ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40 animate-pulse'
                      : 'bg-slate-800 text-slate-400 border-slate-700'
                  }`}
                >
                  {currentQuiz.status === 'active' ? '● LIVE ACTIVE' : currentQuiz.status.toUpperCase()}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Launch topic-based 20-question quizzes, broadcast QR code, and control test status.
            </p>
          </div>

          {/* Current Active Quiz Status or Launcher Form */}
          {currentQuiz && currentQuiz.status === 'active' ? (
            <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/60 via-slate-900 to-purple-950/40 border border-indigo-500/40 shadow-xl space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
                    ACTIVE LIVE SESSION
                  </span>
                  <h3 className="text-lg font-extrabold text-white mt-0.5">{currentQuiz.title}</h3>
                  <p className="text-xs text-slate-300 mt-1">
                    Topic: <span className="text-indigo-300 font-semibold">{currentQuiz.topicName}</span> •{' '}
                    Strictly 20 Questions • {currentQuiz.timeLimitMinutes} min limit
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Session Code</div>
                  <div className="font-mono text-2xl font-black text-indigo-400 tracking-wider mt-0.5">
                    {currentQuiz.code}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Total Questions</div>
                  <div className="font-mono text-2xl font-black text-emerald-400 tracking-wider mt-0.5">
                    20
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Submissions</div>
                  <div className="font-mono text-2xl font-black text-purple-400 tracking-wider mt-0.5">
                    {currentQuiz.submissionCount || 0}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  onClick={copyJoinUrl}
                  className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{copiedLink ? 'Link Copied!' : 'Copy Student Join Link'}</span>
                </button>

                <button
                  onClick={handleEndQuiz}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600/90 hover:bg-rose-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-rose-600/25 transition ml-auto"
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>End / Close Quiz</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-slate-800/40 border border-slate-700/60 space-y-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Create & Launch New Quiz
              </h3>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Select Topic
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

              {/* Requirement Check notice */}
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
                  has20Approved
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                }`}
              >
                {has20Approved ? (
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>
                  {has20Approved
                    ? `Ready to launch: Topic has ${approvedQuestions.length} approved questions. 20 will be selected.`
                    : `Cannot launch: Topic has only ${approvedQuestions.length} approved questions. Go to Question Bank to approve 20 questions.`}
                </span>
              </div>

              <button
                onClick={handleLaunchQuiz}
                disabled={!has20Approved}
                className="w-full py-3 bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 disabled:opacity-40 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                <span>Start Quiz & Generate QR Code →</span>
              </button>
            </div>
          )}
        </div>

        {/* Right side: QR Code Display for Live Projection */}
        <div className="w-full lg:w-auto shrink-0 flex flex-col items-center">
          {currentQuiz ? (
            <QRCodeDisplay
              value={joinUrl}
              code={currentQuiz.code}
              title={`Join: ${currentQuiz.title.substring(0, 24)}...`}
              size={230}
            />
          ) : (
            <div className="w-72 h-80 bg-slate-800/40 border border-slate-700/60 rounded-2xl flex flex-col items-center justify-center p-6 text-center text-slate-500">
              <QrCode className="w-16 h-16 mb-3 opacity-40 text-indigo-400" />
              <p className="text-xs font-semibold text-slate-400">QR Code Display</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Launch a quiz on the left to project the live QR code and code for students.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
