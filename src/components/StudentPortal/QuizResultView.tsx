import React, { useEffect, useState } from 'react';
import { QuizResult } from '../../types/quiz';
import confetti from 'canvas-confetti';
import {
  Trophy,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Clock,
  RotateCcw,
  History,
  ChevronDown,
  ChevronUp,
  Share2,
  Award,
} from 'lucide-react';

interface QuizResultViewProps {
  result: QuizResult;
  onTakeAnother: () => void;
  onViewHistory: () => void;
}

export const QuizResultView: React.FC<QuizResultViewProps> = ({
  result,
  onTakeAnother,
  onViewHistory,
}) => {
  const [filter, setFilter] = useState<'all' | 'correct' | 'incorrect' | 'unanswered'>('all');
  const [expandedExplanation, setExpandedExplanation] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Launch confetti on completion
    if (result.percentage >= 50) {
      try {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      } catch {
        // ignore if canvas not supported
      }
    }
  }, [result.percentage]);

  const toggleExplanation = (qId: string) => {
    setExpandedExplanation((prev) => ({
      ...prev,
      [qId]: !prev[qId],
    }));
  };

  const filteredQuestions = result.breakdown.filter((item) => {
    if (filter === 'correct') return item.isCorrect;
    if (filter === 'incorrect') return !item.isCorrect && item.userSelectedOption !== null;
    if (filter === 'unanswered') return item.userSelectedOption === null;
    return true;
  });

  const minutesTaken = Math.floor(result.timeTakenSeconds / 60);
  const secondsTaken = result.timeTakenSeconds % 60;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      {/* Score Hero Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl text-center">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-yellow-400 flex items-center justify-center mx-auto mb-4 shadow-xl shadow-amber-500/25">
          <Trophy className="w-8 h-8 text-slate-950" />
        </div>

        <span className="text-[11px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-3 py-1 rounded-full">
          Assessment Completed
        </span>

        <h1 className="text-3xl font-black text-white mt-2">
          {result.percentage >= 85
            ? 'Outstanding Performance!'
            : result.percentage >= 70
            ? 'Great Work!'
            : result.percentage >= 50
            ? 'Good Attempt — Quiz Passed!'
            : 'Keep Practicing & Reviewing!'}
        </h1>

        <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
          {result.studentName} • {result.quizTitle}
        </p>

        {/* Big Score Counter */}
        <div className="my-6">
          <div className="font-mono text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-indigo-300 to-purple-400">
            {result.score} <span className="text-2xl text-slate-500 font-bold">/ 20</span>
          </div>
          <div className="text-sm font-bold text-emerald-400 mt-1">
            {result.percentage}% Final Score
          </div>
        </div>

        {/* Breakdown Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-xl mx-auto text-left text-xs mb-6">
          <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
            <div className="text-[10px] text-emerald-300 font-semibold uppercase flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Correct</span>
            </div>
            <div className="text-xl font-black text-emerald-300 mt-1">{result.correctCount}</div>
          </div>

          <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl">
            <div className="text-[10px] text-rose-300 font-semibold uppercase flex items-center gap-1">
              <XCircle className="w-3.5 h-3.5 text-rose-400" />
              <span>Incorrect</span>
            </div>
            <div className="text-xl font-black text-rose-300 mt-1">{result.incorrectCount}</div>
          </div>

          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
            <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
              <span>Unanswered</span>
            </div>
            <div className="text-xl font-black text-slate-300 mt-1">{result.unansweredCount}</div>
          </div>

          <div className="p-3 bg-slate-800/60 border border-slate-700/60 rounded-xl">
            <div className="text-[10px] text-slate-400 font-semibold uppercase flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Time Taken</span>
            </div>
            <div className="text-base font-black text-white mt-1">
              {minutesTaken}m {secondsTaken}s
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 justify-center">
          <button
            onClick={onTakeAnother}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Take Another Quiz</span>
          </button>

          <button
            onClick={onViewHistory}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <History className="w-4 h-4 text-purple-400" />
            <span>My Attempt History</span>
          </button>
        </div>
      </div>

      {/* Detailed Question-by-Question Solution Review */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-4 h-4 text-indigo-400" />
              <span>Detailed Question Review & Explanations</span>
            </h2>
            <p className="text-xs text-slate-400">
              Verify your answers and read educational solution rationales.
            </p>
          </div>

          {/* Filter Pill */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl text-[11px] font-bold">
            <button
              onClick={() => setFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All (20)
            </button>
            <button
              onClick={() => setFilter('correct')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'correct' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Correct ({result.correctCount})
            </button>
            <button
              onClick={() => setFilter('incorrect')}
              className={`px-2.5 py-1 rounded-lg transition ${
                filter === 'incorrect' ? 'bg-rose-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Wrong ({result.incorrectCount})
            </button>
          </div>
        </div>

        {/* Questions list */}
        <div className="space-y-4 pt-2">
          {filteredQuestions.map((q, idx) => (
            <div
              key={q.questionId}
              className={`p-4 rounded-2xl border transition ${
                q.isCorrect
                  ? 'bg-emerald-950/20 border-emerald-500/30'
                  : q.userSelectedOption === null
                  ? 'bg-slate-800/40 border-slate-700/60'
                  : 'bg-rose-950/20 border-rose-500/30'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    Q{idx + 1}
                  </span>
                  <span
                    className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                      q.isCorrect
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : q.userSelectedOption === null
                        ? 'bg-slate-700 text-slate-300'
                        : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    }`}
                  >
                    {q.isCorrect
                      ? '✓ Correct'
                      : q.userSelectedOption === null
                      ? 'Unanswered'
                      : '✗ Incorrect'}
                  </span>
                </div>
              </div>

              <p className="text-sm font-semibold text-white mb-3">{q.questionText}</p>

              {/* Options status */}
              <div className="space-y-1.5 text-xs mb-3">
                {q.options.map((opt, oIdx) => {
                  const isUserPick = q.userSelectedOption === oIdx;
                  const isRightPick = q.correctOption === oIdx;

                  let optCls = 'bg-slate-800/50 border-slate-700/60 text-slate-300';
                  if (isRightPick) {
                    optCls = 'bg-emerald-950/50 border-emerald-500 text-emerald-200 font-semibold';
                  } else if (isUserPick && !isRightPick) {
                    optCls = 'bg-rose-950/50 border-rose-500 text-rose-200 font-semibold';
                  }

                  return (
                    <div
                      key={oIdx}
                      className={`px-3 py-2 rounded-xl border flex items-center justify-between gap-2 ${optCls}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono text-[11px] opacity-75">
                          {String.fromCharCode(65 + oIdx)}.
                        </span>
                        <span>{opt}</span>
                      </div>

                      <div className="text-[10px] font-bold shrink-0">
                        {isRightPick && isUserPick && (
                          <span className="text-emerald-400 flex items-center gap-1">
                            ✓ Your Choice (Correct)
                          </span>
                        )}
                        {isRightPick && !isUserPick && (
                          <span className="text-emerald-400">✓ Correct Answer</span>
                        )}
                        {!isRightPick && isUserPick && (
                          <span className="text-rose-400">✗ Your Choice</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanation Note */}
              {q.explanation && (
                <div className="pt-2 text-xs">
                  <div className="bg-slate-800/70 p-3 rounded-xl border border-slate-700/60 text-slate-300 text-[11px] leading-relaxed">
                    <span className="font-bold text-indigo-300">Explanation:</span>{' '}
                    {q.explanation}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
