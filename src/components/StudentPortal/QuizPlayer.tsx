import React, { useState, useEffect, useRef } from 'react';
import { Quiz, Question, QuizAttempt, QuizResult, QuestionResultBreakdown } from '../../types/quiz';
import { saveAttempt, submitResult } from '../../firebase/service';
import {
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  Send,
  AlertTriangle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';

interface QuizPlayerProps {
  quiz: Quiz;
  questions: Question[]; // original questions pool
  studentName: string;
  studentEmail?: string;
  studentId: string;
  onQuizSubmitted: (result: QuizResult) => void;
}

const OPTION_SHAPES = ['▲', '◆', '●', '■'];
const OPTION_COLORS = [
  'bg-rose-500/15 border-rose-500/30 text-rose-200 hover:border-rose-500 hover:bg-rose-500/25',
  'bg-blue-500/15 border-blue-500/30 text-blue-200 hover:border-blue-500 hover:bg-blue-500/25',
  'bg-amber-500/15 border-amber-500/30 text-amber-200 hover:border-amber-500 hover:bg-amber-500/25',
  'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 hover:border-emerald-500 hover:bg-emerald-500/25',
];
const OPTION_SELECTED_COLORS = [
  'bg-rose-600 border-white text-white shadow-lg shadow-rose-600/30 ring-2 ring-rose-400',
  'bg-blue-600 border-white text-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-400',
  'bg-amber-600 border-white text-white shadow-lg shadow-amber-600/30 ring-2 ring-amber-400',
  'bg-emerald-600 border-white text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400',
];

export const QuizPlayer: React.FC<QuizPlayerProps> = ({
  quiz,
  questions,
  studentName,
  studentEmail,
  studentId,
  onQuizSubmitted,
}) => {
  // 1. Prepare 20 randomized questions and randomized options per question
  const [shuffledQuestions, setShuffledQuestions] = useState<Question[]>([]);
  // map: questionId -> array of original option indices [permuted_0, permuted_1, permuted_2, permuted_3]
  const [optionPermutations, setOptionPermutations] = useState<Record<string, number[]>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Selected answers: map of questionId -> chosen permuted index (0..3) or null
  const [answers, setAnswers] = useState<Record<string, number | null>>({});
  const [flagged, setFlagged] = useState<Record<string, boolean>>({});

  // Timer
  const [secondsRemaining, setSecondsRemaining] = useState(quiz.timeLimitMinutes * 60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const attemptIdRef = useRef(`att-${quiz.id}-${studentId}`);
  const startTimeRef = useRef(Date.now());

  // Initialize random sequence
  useEffect(() => {
    // Select questions specified by quiz or matching topic, ensuring exactly 20
    let pool = questions.filter((q) => quiz.questionIds.includes(q.id));
    if (pool.length < 20) {
      pool = questions.filter((q) => q.topicId === quiz.topicId);
    }
    if (pool.length < 20) {
      pool = questions;
    }

    // Shuffle 20 questions
    const shuffled = [...pool].sort(() => Math.random() - 0.5).slice(0, 20);

    // Build option permutation for each question
    const permMap: Record<string, number[]> = {};
    const initAnswers: Record<string, number | null> = {};

    shuffled.forEach((q) => {
      // Create random order [0, 1, 2, 3]
      const order = [0, 1, 2, 3].sort(() => Math.random() - 0.5);
      permMap[q.id] = order;
      initAnswers[q.id] = null;
    });

    setShuffledQuestions(shuffled);
    setOptionPermutations(permMap);
    setAnswers(initAnswers);

    // Initialize in-progress attempt in Firebase
    const initAttempt: QuizAttempt = {
      id: attemptIdRef.current,
      quizId: quiz.id,
      quizCode: quiz.code,
      studentId,
      studentName,
      studentEmail: studentEmail || '',
      answers: initAnswers,
      shuffledQuestionIds: shuffled.map((q) => q.id),
      optionOrderMap: permMap,
      startedAt: new Date().toISOString(),
      lastSavedAt: new Date().toISOString(),
      timeRemainingSeconds: quiz.timeLimitMinutes * 60,
      isSubmitted: false,
    };
    saveAttempt(initAttempt);
  }, [quiz.id]);

  // Countdown Timer
  useEffect(() => {
    if (isSubmitting || shuffledQuestions.length === 0) return;

    const timer = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeExpired();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isSubmitting, shuffledQuestions.length]);

  const handleTimeExpired = () => {
    // Auto-submit immediately
    handleSubmitFinal(true);
  };

  // Select Option and Auto-Save
  const handleSelectOption = (questionId: string, permutedOptionIndex: number) => {
    const updatedAnswers = {
      ...answers,
      [questionId]: permutedOptionIndex,
    };
    setAnswers(updatedAnswers);

    // Auto-save to Firebase
    saveAttempt({
      id: attemptIdRef.current,
      quizId: quiz.id,
      quizCode: quiz.code,
      studentId,
      studentName,
      studentEmail: studentEmail || '',
      answers: updatedAnswers,
      shuffledQuestionIds: shuffledQuestions.map((q) => q.id),
      optionOrderMap: optionPermutations,
      startedAt: new Date(startTimeRef.current).toISOString(),
      lastSavedAt: new Date().toISOString(),
      timeRemainingSeconds: secondsRemaining,
      isSubmitted: false,
    });
  };

  const handleClearAnswer = (questionId: string) => {
    const updatedAnswers = {
      ...answers,
      [questionId]: null,
    };
    setAnswers(updatedAnswers);
  };

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // Submit and Calculate Score
  const handleSubmitFinal = async (isAuto = false) => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setShowSubmitModal(false);

    const timeTaken = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000));

    let correctCount = 0;
    let incorrectCount = 0;
    let unansweredCount = 0;

    const breakdown: QuestionResultBreakdown[] = [];

    shuffledQuestions.forEach((q) => {
      const permutedChosen = answers[q.id];
      const permOrder = optionPermutations[q.id] || [0, 1, 2, 3];

      let originalChosen: number | null = null;
      let isCorrect = false;

      if (permutedChosen !== null && permutedChosen !== undefined) {
        originalChosen = permOrder[permutedChosen];
        if (originalChosen === q.correctOption) {
          correctCount++;
          isCorrect = true;
        } else {
          incorrectCount++;
        }
      } else {
        unansweredCount++;
      }

      breakdown.push({
        questionId: q.id,
        questionText: q.questionText,
        options: q.options,
        userSelectedOption: originalChosen,
        correctOption: q.correctOption,
        isCorrect,
        explanation: q.explanation,
      });
    });

    const score = correctCount;
    const percentage = Math.round((score / 20) * 100);

    const finalResult: QuizResult = {
      id: `res-${quiz.id}-${studentId}-${Date.now()}`,
      quizId: quiz.id,
      quizCode: quiz.code,
      quizTitle: quiz.title,
      topicName: quiz.topicName,
      studentId,
      studentName,
      studentEmail: studentEmail || '',
      score,
      totalQuestions: 20,
      percentage,
      correctCount,
      incorrectCount,
      unansweredCount,
      timeTakenSeconds: timeTaken,
      breakdown,
      submittedAt: new Date().toISOString(),
    };

    // Save to Firebase and update status
    await submitResult(finalResult);
    onQuizSubmitted(finalResult);
  };

  if (shuffledQuestions.length === 0) {
    return (
      <div className="max-w-2xl mx-auto py-20 text-center text-slate-400">
        <Sparkles className="w-8 h-8 text-indigo-400 animate-spin mx-auto mb-3" />
        <p className="text-sm font-semibold text-white">Preparing your 20 randomized questions...</p>
      </div>
    );
  }

  const currentQ = shuffledQuestions[currentIndex];
  const currentPermOrder = optionPermutations[currentQ.id] || [0, 1, 2, 3];
  const selectedChoice = answers[currentQ.id];
  const isCurrentFlagged = flagged[currentQ.id];

  const answeredCount = Object.values(answers).filter((v) => v !== null && v !== undefined).length;
  const remainingCount = 20 - answeredCount;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const isTimeLow = secondsRemaining <= 60;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Top Bar: Progress, Timer, Auto-save status */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs font-black px-3 py-1 rounded-xl bg-indigo-600 text-white shadow-md shadow-indigo-600/30">
            Q {currentIndex + 1} / 20
          </span>
          <div className="hidden sm:block">
            <span className="text-xs font-semibold text-white truncate max-w-[200px] inline-block">
              {quiz.title}
            </span>
            <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Auto-saved to cloud</span>
            </div>
          </div>
        </div>

        {/* Timer */}
        <div
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-mono text-sm font-black border transition ${
            isTimeLow
              ? 'bg-rose-950/80 border-rose-500 text-rose-300 animate-pulse'
              : 'bg-slate-800 border-slate-700 text-amber-300'
          }`}
        >
          <Clock className={`w-4 h-4 ${isTimeLow ? 'text-rose-400' : 'text-amber-400'}`} />
          <span>
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </span>
        </div>

        {/* Submit Button */}
        <button
          onClick={() => setShowSubmitModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/25 transition"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Submit (20 Qs)</span>
        </button>
      </div>

      {/* Main Question Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
        <div className="flex items-start justify-between gap-4 mb-4">
          <span className="text-xs font-bold text-slate-400 tracking-wider uppercase">
            Question {currentIndex + 1} of 20
          </span>

          <button
            onClick={() => toggleFlag(currentQ.id)}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition border ${
              isCurrentFlagged
                ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>{isCurrentFlagged ? 'Flagged' : 'Flag'}</span>
          </button>
        </div>

        {/* Question Text */}
        <h2 className="text-lg sm:text-xl font-extrabold text-white mb-6 leading-relaxed">
          {currentQ.questionText}
        </h2>

        {/* 4 Multiple Choice Options (Shuffled Order) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {currentPermOrder.map((originalOptIdx, permutedIdx) => {
            const isSelected = selectedChoice === permutedIdx;
            const optionText = currentQ.options[originalOptIdx];

            return (
              <button
                key={permutedIdx}
                onClick={() => handleSelectOption(currentQ.id, permutedIdx)}
                className={`p-4 rounded-2xl border text-left transition relative flex items-center gap-3.5 cursor-pointer ${
                  isSelected
                    ? OPTION_SELECTED_COLORS[permutedIdx % 4]
                    : OPTION_COLORS[permutedIdx % 4]
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-inner ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-slate-800/80 text-white'
                  }`}
                >
                  {OPTION_SHAPES[permutedIdx]}
                </div>
                <div className="flex-1 text-sm font-semibold leading-snug">
                  {optionText}
                </div>
                {isSelected && (
                  <CheckCircle2 className="w-5 h-5 text-white shrink-0 ml-1" />
                )}
              </button>
            );
          })}
        </div>

        {/* Question Footer: Clear & Nav */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-800 text-xs">
          {selectedChoice !== null && selectedChoice !== undefined ? (
            <button
              onClick={() => handleClearAnswer(currentQ.id)}
              className="flex items-center gap-1 text-slate-400 hover:text-rose-400 transition"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Clear Choice</span>
            </button>
          ) : (
            <div />
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="flex items-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 font-bold rounded-xl transition"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </button>

            {currentIndex < 19 ? (
              <button
                onClick={() => setCurrentIndex((prev) => Math.min(19, prev + 1))}
                className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
              >
                <span>Next</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="flex items-center gap-1 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition"
              >
                <span>Review & Submit</span>
                <Send className="w-3.5 h-3.5 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 20 Question Palette (Navigator) */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-bold text-slate-300 uppercase tracking-wider">
            Question Palette (20 Total)
          </span>
          <div className="flex items-center gap-3 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              <span>Answered ({answeredCount})</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
              <span>Flagged ({Object.values(flagged).filter(Boolean).length})</span>
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
              <span>Left ({remainingCount})</span>
            </span>
          </div>
        </div>

        <div className="grid grid-cols-10 gap-2">
          {shuffledQuestions.map((q, idx) => {
            const isAnswered = answers[q.id] !== null && answers[q.id] !== undefined;
            const isFlag = flagged[q.id];
            const isCurrent = idx === currentIndex;

            return (
              <button
                key={q.id}
                onClick={() => setCurrentIndex(idx)}
                className={`py-2 rounded-xl font-mono text-xs font-bold transition relative border ${
                  isCurrent
                    ? 'ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 border-white text-white bg-indigo-600'
                    : isAnswered
                    ? 'bg-emerald-600/30 border-emerald-500/50 text-emerald-300 hover:bg-emerald-600/50'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-400 hover:text-white hover:bg-slate-700'
                }`}
              >
                {idx + 1}
                {isFlag && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation Submit Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative">
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-4">
              <Send className="w-6 h-6" />
            </div>

            <h3 className="text-xl font-extrabold text-white mb-1">
              Submit Your Assessment?
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              You are about to submit your 20-question responses for final evaluation.
            </p>

            <div className="p-3 bg-slate-800/60 rounded-xl border border-slate-700 space-y-2 mb-6 text-xs">
              <div className="flex justify-between text-slate-300">
                <span>Answered Questions:</span>
                <span className="font-bold text-emerald-400">{answeredCount} / 20</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Unanswered / Skipped:</span>
                <span className="font-bold text-amber-400">{remainingCount} / 20</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span>Time Remaining:</span>
                <span className="font-mono text-white">
                  {minutes}m {seconds}s
                </span>
              </div>
            </div>

            {remainingCount > 0 && (
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-300 text-[11px] mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>You still have {remainingCount} unanswered questions!</span>
              </div>
            )}

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Back to Questions
              </button>
              <button
                type="button"
                onClick={() => handleSubmitFinal(false)}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 transition"
              >
                Confirm & Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
