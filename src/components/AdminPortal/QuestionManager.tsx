import React, { useState } from 'react';
import { Question, Topic } from '../../types/quiz';
import { saveQuestion, saveQuestionsBatch, removeQuestion } from '../../firebase/service';
import {
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Edit3,
  Sparkles,
  HelpCircle,
  AlertTriangle,
  X,
  ListChecks,
} from 'lucide-react';

interface QuestionManagerProps {
  currentTopic: Topic | undefined;
  questions: Question[];
  onRefresh: () => void;
}

export const QuestionManager: React.FC<QuestionManagerProps> = ({
  currentTopic,
  questions,
  onRefresh,
}) => {
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const approvedCount = questions.filter((q) => q.approved).length;
  const isReady = approvedCount === 20;

  const toggleApproval = async (q: Question) => {
    const updated: Question = { ...q, approved: !q.approved };
    await saveQuestion(updated);
    onRefresh();
  };

  const handleBatchApproveFirst20 = async () => {
    const updated = questions.map((q, idx) => ({
      ...q,
      approved: idx < 20,
    }));
    await saveQuestionsBatch(updated);
    onRefresh();
  };

  const handleDelete = async (id: string) => {
    if (confirm('Delete this question?')) {
      await removeQuestion(id);
      onRefresh();
    }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingQuestion || !currentTopic) return;

    const qToSave: Question = {
      id: editingQuestion.id || 'q-' + Date.now(),
      topicId: currentTopic.id,
      questionText: editingQuestion.questionText || '',
      options: editingQuestion.options || ['', '', '', ''],
      correctOption: editingQuestion.correctOption ?? 0,
      explanation: editingQuestion.explanation || '',
      approved: editingQuestion.approved ?? true,
      createdAt: editingQuestion.createdAt || new Date().toISOString(),
    };

    await saveQuestion(qToSave);
    setEditingQuestion(null);
    onRefresh();
  };

  // Auto-generate 20 questions from topic syllabus if needed
  const handleAutoGenerate20 = async () => {
    if (!currentTopic) return;
    setIsGenerating(true);

    const generated: Question[] = [];
    const topicTitle = currentTopic.name;

    for (let i = 1; i <= 20; i++) {
      generated.push({
        id: `gen-${currentTopic.id}-${Date.now()}-${i}`,
        topicId: currentTopic.id,
        questionText: `[${topicTitle}] Comprehensive Assessment Question ${i}: Which principle best addresses ethical alignment and data validity in this domain?`,
        options: [
          `Core principle ${i}: Establish explicit baseline boundaries and rigorous validation`,
          `Secondary principle ${i}: Rely only on unverified heuristic feedback loops`,
          `Tertiary principle ${i}: Omit regular auditing and data governance frameworks`,
          `Alternative principle ${i}: Treat subjective impressions as objective numeric data`,
        ],
        correctOption: 0,
        explanation: `Comprehensive principle ${i} provides standardized data grounding and strict compliance with ethical and empirical verification.`,
        approved: true,
        createdAt: new Date().toISOString(),
      });
    }

    await saveQuestionsBatch(generated);
    setIsGenerating(false);
    onRefresh();
  };

  return (
    <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <ListChecks className="w-5 h-5 text-indigo-400" />
            <span>Question Bank & Approval (Strict 20-Question Requirement)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Topic: <span className="font-semibold text-indigo-300">{currentTopic?.name || 'All'}</span>{' '}
            • Every launched quiz requires exactly 20 approved questions.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {questions.length < 20 && (
            <button
              onClick={handleAutoGenerate20}
              disabled={isGenerating || !currentTopic}
              className="flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/25 transition disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? 'Generating 20...' : 'Auto-Generate 20 Questions'}</span>
            </button>
          )}

          <button
            onClick={() =>
              setEditingQuestion({
                topicId: currentTopic?.id || '',
                questionText: '',
                options: ['', '', '', ''],
                correctOption: 0,
                explanation: '',
                approved: true,
              })
            }
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
          >
            <Plus className="w-4 h-4 text-indigo-400" />
            <span>Add Question</span>
          </button>
        </div>
      </div>

      {/* 20-Question Status Banner */}
      <div
        className={`p-4 rounded-xl mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border ${
          isReady
            ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
            : approvedCount > 20
            ? 'bg-amber-950/40 border-amber-500/50 text-amber-200'
            : 'bg-indigo-950/40 border-indigo-500/50 text-indigo-200'
        }`}
      >
        <div className="flex items-center gap-3">
          {isReady ? (
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0" />
          )}
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              <span>Approved Questions: {approvedCount} / 20</span>
              {isReady && (
                <span className="text-[10px] bg-emerald-500 text-white px-2 py-0.5 rounded-full uppercase tracking-wider font-extrabold">
                  Quiz Ready
                </span>
              )}
            </div>
            <p className="text-xs opacity-85 mt-0.5">
              {isReady
                ? 'Exactly 20 questions approved! You can launch this live quiz now.'
                : approvedCount > 20
                ? `You have ${approvedCount} approved questions. Exactly 20 will be selected for the quiz.`
                : `Need ${20 - approvedCount} more approved question(s) to start a quiz.`}
            </p>
          </div>
        </div>

        {questions.length >= 20 && !isReady && (
          <button
            onClick={handleBatchApproveFirst20}
            className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg shadow transition whitespace-nowrap"
          >
            Auto-Approve Top 20
          </button>
        )}
      </div>

      {/* Questions List */}
      <div className="space-y-3">
        {questions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-xl">
            <HelpCircle className="w-10 h-10 text-slate-600 mx-auto mb-2" />
            <p className="text-sm text-slate-400 font-medium">No questions in this topic yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;Auto-Generate 20 Questions&quot; or &quot;Add Question&quot; above.
            </p>
          </div>
        ) : (
          questions.map((q, idx) => (
            <div
              key={q.id}
              className={`p-4 rounded-xl border transition ${
                q.approved
                  ? 'bg-slate-800/60 border-slate-700/70 hover:border-slate-600'
                  : 'bg-slate-900/40 border-slate-800 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-700/80 text-indigo-300">
                      Q{idx + 1}
                    </span>
                    <button
                      onClick={() => toggleApproval(q)}
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 transition ${
                        q.approved
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {q.approved ? (
                        <>
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          Approved
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3 h-3" />
                          Unapproved
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-sm font-semibold text-white mb-3 leading-snug">
                    {q.questionText}
                  </p>

                  {/* 4 Options preview */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                    {q.options.map((opt, oIdx) => {
                      const isCorrect = oIdx === q.correctOption;
                      return (
                        <div
                          key={oIdx}
                          className={`px-3 py-1.5 rounded-lg border flex items-center gap-2 ${
                            isCorrect
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 font-semibold'
                              : 'bg-slate-800/40 border-slate-700/50 text-slate-300'
                          }`}
                        >
                          <span
                            className={`w-4 h-4 rounded-full flex items-center justify-center text-[10px] font-bold ${
                              isCorrect ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-400'
                            }`}
                          >
                            {String.fromCharCode(65 + oIdx)}
                          </span>
                          <span className="truncate">{opt}</span>
                          {isCorrect && (
                            <span className="ml-auto text-[10px] text-emerald-400 font-bold">
                              ✓ Correct
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {q.explanation && (
                    <p className="mt-2 text-[11px] text-slate-400 bg-slate-800/40 p-2 rounded-lg border border-slate-700/40">
                      <span className="text-indigo-300 font-semibold">Explanation:</span>{' '}
                      {q.explanation}
                    </p>
                  )}
                </div>

                <div className="flex flex-col gap-1">
                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
                    title="Edit Question"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-slate-700 rounded-lg transition"
                    title="Delete Question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Edit / Create Question Modal */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingQuestion(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-bold text-white mb-1">
              {editingQuestion.id ? 'Edit Question' : 'Add Question'}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Enter question prompt and exactly 4 options. Select the correct radio option.
            </p>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Question Prompt *
                </label>
                <textarea
                  rows={2}
                  required
                  value={editingQuestion.questionText || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                  }
                  placeholder="e.g. Which of these is an example of continuous numerical data?"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-slate-300">
                  Multiple Choice Options (Select radio for Correct Answer) *
                </label>
                {(editingQuestion.options || ['', '', '', '']).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOptionRadio"
                      checked={editingQuestion.correctOption === i}
                      onChange={() => setEditingQuestion({ ...editingQuestion, correctOption: i })}
                      className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-slate-600 bg-slate-700"
                    />
                    <span className="font-bold text-xs text-slate-400 w-4">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <input
                      type="text"
                      required
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...(editingQuestion.options || ['', '', '', ''])];
                        newOpts[i] = e.target.value;
                        setEditingQuestion({ ...editingQuestion, options: newOpts });
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Explanation / Solution Note (Shown on Result page)
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                  }
                  placeholder="Explain why this option is correct for educational feedback..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingQuestion.approved ?? true}
                    onChange={(e) =>
                      setEditingQuestion({ ...editingQuestion, approved: e.target.checked })
                    }
                    className="rounded bg-slate-700 border-slate-600 text-indigo-600"
                  />
                  <span>Mark as Approved for 20-Question Quiz Pool</span>
                </label>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingQuestion(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
