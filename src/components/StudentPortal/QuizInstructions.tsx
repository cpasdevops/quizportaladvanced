import React from 'react';
import { Quiz } from '../../types/quiz';
import {
  FileText,
  Clock,
  Shuffle,
  Save,
  CheckCircle2,
  AlertTriangle,
  Play,
  ArrowLeft,
  Award,
} from 'lucide-react';

interface QuizInstructionsProps {
  quiz: Quiz;
  studentName: string;
  onStartQuiz: () => void;
  onBack: () => void;
}

export const QuizInstructions: React.FC<QuizInstructionsProps> = ({
  quiz,
  studentName,
  onStartQuiz,
  onBack,
}) => {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl space-y-6">
        {/* Top Banner */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full">
              Code: {quiz.code}
            </span>
            <h1 className="text-2xl font-black text-white mt-2 leading-tight">
              {quiz.title}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Candidate: <span className="text-white font-bold">{studentName}</span> • Topic:{' '}
              <span className="text-indigo-300 font-semibold">{quiz.topicName}</span>
            </p>
          </div>

          <button
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            title="Back to Join"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        </div>

        {/* Highlight Stats Pill */}
        <div className="grid grid-cols-3 gap-3 p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60 text-center">
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Questions</div>
            <div className="text-xl font-black text-indigo-400 mt-0.5">20</div>
            <div className="text-[10px] text-slate-500">Multiple choice</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Time Limit</div>
            <div className="text-xl font-black text-amber-400 mt-0.5">
              {quiz.timeLimitMinutes} min
            </div>
            <div className="text-[10px] text-slate-500">Auto-submits</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase">Passing Mark</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">50%</div>
            <div className="text-[10px] text-slate-500">Instant result</div>
          </div>
        </div>

        {/* Rules & Guidelines */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Important Instructions & Protocol:
          </h2>

          <div className="space-y-2.5 text-xs text-slate-300">
            <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800">
              <Shuffle className="w-4 h-4 text-indigo-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Randomized Question Order & Options:</span>
                <p className="text-slate-400 mt-0.5">
                  You will receive exactly 20 questions in a randomized sequence. Answer options are also randomized to uphold test integrity.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800">
              <Save className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Continuous Auto-Save:</span>
                <p className="text-slate-400 mt-0.5">
                  Every answer option you select is immediately saved to the Firebase cloud database. If your tab reloads, your progress is preserved.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800">
              <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Countdown Timer & Auto-Submit:</span>
                <p className="text-slate-400 mt-0.5">
                  The countdown starts as soon as you press &quot;Start Assessment&quot;. When the timer reaches zero, the system will automatically submit your attempt.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-800">
              <Award className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-white">Instant Results & Explanations:</span>
                <p className="text-slate-400 mt-0.5">
                  Immediately upon submitting, your score, percentage, and full question explanations will be displayed and stored in your profile.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Start Button */}
        <div className="pt-2">
          <button
            onClick={onStartQuiz}
            className="w-full py-4 bg-gradient-to-r from-emerald-600 via-indigo-600 to-purple-600 hover:from-emerald-500 hover:to-purple-500 text-white font-extrabold text-sm rounded-2xl shadow-xl shadow-indigo-600/30 transition flex items-center justify-center gap-2 transform active:scale-[0.99]"
          >
            <Play className="w-5 h-5 fill-white" />
            <span>I Am Ready — Start 20-Question Assessment →</span>
          </button>
        </div>
      </div>
    </div>
  );
};
