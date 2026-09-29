import React, { useEffect, useState } from 'react';
import { Quiz } from '../../types/quiz';
import { subscribeToQuiz, fetchQuizByCode } from '../../firebase/service';
import {
  Clock,
  Sparkles,
  ArrowLeft,
  Users,
  Radio,
  BookOpen,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

interface WaitingLobbyProps {
  quiz: Quiz;
  studentName: string;
  onQuizActivated: (activatedQuiz: Quiz) => void;
  onLeave: () => void;
}

export const WaitingLobby: React.FC<WaitingLobbyProps> = ({
  quiz,
  studentName,
  onQuizActivated,
  onLeave,
}) => {
  const [currentStatus, setCurrentStatus] = useState<string>(quiz.status);

  useEffect(() => {
    // 1. Subscribe to Firebase / local updates for this quiz
    const unsub = subscribeToQuiz(quiz.id, (updated) => {
      if (updated) {
        setCurrentStatus(updated.status);
        if (updated.status === 'active') {
          onQuizActivated(updated);
        }
      }
    });

    // 2. Poll every 1.5s as backup
    const interval = setInterval(async () => {
      const q = await fetchQuizByCode(quiz.code);
      if (q) {
        setCurrentStatus(q.status);
        if (q.status === 'active') {
          onQuizActivated(q);
        }
      }
    }, 1500);

    // 3. Custom window event for instant same-browser sync
    const handleStatusEvent = (e: any) => {
      if (e.detail?.quizId === quiz.id && e.detail?.status === 'active') {
        onQuizActivated({ ...quiz, status: 'active' });
      }
    };
    window.addEventListener('quiz-status-changed', handleStatusEvent);

    return () => {
      unsub();
      clearInterval(interval);
      window.removeEventListener('quiz-status-changed', handleStatusEvent);
    };
  }, [quiz.id, quiz.code, onQuizActivated]);

  return (
    <div className="max-w-xl mx-auto px-4 py-12">
      <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl text-center space-y-6">
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-52 h-52 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-52 h-52 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Leave Button */}
        <div className="flex justify-between items-center pb-2">
          <button
            onClick={onLeave}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Leave Lobby</span>
          </button>
          <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-full flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Waiting for Host
          </span>
        </div>

        {/* Pulsing Radar Ring */}
        <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full bg-indigo-500/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-indigo-500/30 animate-pulse" />
          <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center text-white shadow-xl shadow-indigo-500/40 relative z-10">
            <Radio className="w-8 h-8 animate-bounce" />
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-black text-white">Quiz Lobby Connected</h2>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Welcome, <span className="text-white font-bold">{studentName}</span>! You are connected to the session.
          </p>
        </div>

        {/* Session Code Highlight Card */}
        <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 max-w-sm mx-auto">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">
            Session Code
          </div>
          <div className="font-mono text-3xl font-black text-indigo-400 tracking-widest">
            {quiz.code}
          </div>
          <div className="text-xs font-semibold text-white mt-2 truncate">
            {quiz.title}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Topic: <span className="text-indigo-300">{quiz.topicName}</span> • 20 Questions
          </div>
        </div>

        {/* Waiting Status Message */}
        <div className="p-3.5 bg-amber-950/40 border border-amber-500/30 rounded-xl text-amber-200 text-xs flex items-center justify-center gap-2 max-w-sm mx-auto">
          <Clock className="w-4 h-4 text-amber-400 shrink-0 animate-spin" />
          <span>Waiting for Admin to start the quiz...</span>
        </div>

        <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
          Keep this window open. As soon as your teacher/host clicks &quot;Start Quiz&quot;, your test will launch automatically.
        </p>
      </div>
    </div>
  );
};
