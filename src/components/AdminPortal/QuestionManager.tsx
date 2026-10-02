import React, { useState, useRef } from 'react';
import { Question, Topic } from '../../types/quiz';
import {
  saveQuestion,
  saveQuestionsBatch,
  removeQuestion,
  replaceTopicQuestions,
} from '../../firebase/service';
import {
  generateQuestionsForTopic,
  deduplicateQuestionList,
} from '../../services/aiQuestionGenerator';
import {
  parseQuestionsFromFileContent,
  downloadSampleCsvTemplate,
  downloadSampleJsonTemplate,
} from '../../utils/questionParser';
import { exportQuestionsToExcel, exportQuestionsToPdf } from '../../utils/exportQuestions';
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
  Upload,
  FileSpreadsheet,
  FileText,
  Download,
  Loader2,
  Check,
  BookOpen,
  Eye,
  Layers,
} from 'lucide-react';

interface QuestionManagerProps {
  currentTopic: Topic | undefined;
  topics: Topic[];
  questions: Question[];
  onSelectTopic: (topicId: string) => void;
  onRefresh: () => void;
}

export const QuestionManager: React.FC<QuestionManagerProps> = ({
  currentTopic,
  topics,
  questions,
  onSelectTopic,
  onRefresh,
}) => {
  const [editingQuestion, setEditingQuestion] = useState<Partial<Question> | null>(null);

  // AI Generator state
  const [showAiModal, setShowAiModal] = useState(false);
  const [generateCount, setGenerateCount] = useState<number>(20);
  const [replaceExistingPool, setReplaceExistingPool] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPreview, setGeneratedPreview] = useState<Question[] | null>(null);

  // Bulk Upload state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadTopicId, setUploadTopicId] = useState<string>(currentTopic?.id || topics[0]?.id || '');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [pastedText, setPastedText] = useState<string>('');
  const [uploadMode, setUploadMode] = useState<'file' | 'paste'>('file');
  const [parsedQuestions, setParsedQuestions] = useState<Question[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter questions for the selected topic
  const topicQuestions = questions.filter((q) => q.topicId === (currentTopic?.id || ''));
  const approvedCount = topicQuestions.filter((q) => q.approved).length;
  const isReady = approvedCount >= 20;

  const toggleApproval = async (q: Question) => {
    const updated: Question = { ...q, approved: !q.approved };
    await saveQuestion(updated);
    onRefresh();
  };

  const handleBatchApproveFirst20 = async () => {
    const updated = topicQuestions.map((q, idx) => ({
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

  // --- AI GENERATOR ---
  const handleRunAiGeneration = async () => {
    if (!currentTopic) return;
    setIsGenerating(true);
    try {
      const generated = await generateQuestionsForTopic(currentTopic, generateCount);
      setGeneratedPreview(generated);
    } catch (err: any) {
      alert(`Generation notice: ${err.message || 'Error generating questions'}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDeduplicateCurrentTopic = async () => {
    if (!currentTopic || topicQuestions.length === 0) return;
    const clean20 = deduplicateQuestionList(topicQuestions, currentTopic, 20);
    await replaceTopicQuestions(currentTopic.id, clean20);
    onRefresh();
  };

  const handleSaveGeneratedQuestions = async () => {
    if (!generatedPreview || generatedPreview.length === 0 || !currentTopic) return;
    if (replaceExistingPool) {
      await replaceTopicQuestions(currentTopic.id, generatedPreview);
    } else {
      await saveQuestionsBatch(generatedPreview);
    }
    setGeneratedPreview(null);
    setShowAiModal(false);
    onRefresh();
  };

  // --- BULK UPLOAD ---
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFile(file);
    setIsProcessingUpload(true);
    setParseErrors([]);

    try {
      const text = await file.text();
      const targetId = uploadTopicId || currentTopic?.id || topics[0]?.id || 'default';
      const { questions: parsed, errors } = parseQuestionsFromFileContent(text, targetId);
      setParsedQuestions(parsed);
      setParseErrors(errors);
    } catch (err: any) {
      setParseErrors([`Failed to read file: ${err.message}`]);
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleParsePastedText = () => {
    if (!pastedText.trim()) return;
    setIsProcessingUpload(true);
    setParseErrors([]);
    const targetId = uploadTopicId || currentTopic?.id || topics[0]?.id || 'default';
    const { questions: parsed, errors } = parseQuestionsFromFileContent(pastedText, targetId);
    setParsedQuestions(parsed);
    setParseErrors(errors);
    setIsProcessingUpload(false);
  };

  const handleConfirmUpload = async () => {
    if (parsedQuestions.length === 0) return;
    // Map to selected uploadTopicId
    const targetId = uploadTopicId || currentTopic?.id || topics[0]?.id || 'default';
    const mapped = parsedQuestions.map((q) => ({ ...q, topicId: targetId }));

    await saveQuestionsBatch(mapped);
    setShowUploadModal(false);
    setUploadFile(null);
    setPastedText('');
    setParsedQuestions([]);
    setParseErrors([]);
    onRefresh();
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Topic Filter */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <ListChecks className="w-5 h-5 text-emerald-400" />
              <h2 className="text-xl font-bold text-white">Questions Hub & Question Pool</h2>
            </div>
            <p className="text-xs text-slate-400">
              Upload custom questions with topics, generate questions on topic with AI, and curate the 20-question pool.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {topicQuestions.length > 0 && (
              <div className="flex items-center gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => exportQuestionsToExcel(topicQuestions, 'topic_questions', currentTopic?.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 text-emerald-300 text-xs font-bold rounded-lg transition"
                  title="Download all questions in this topic in Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel</span>
                </button>
                <button
                  type="button"
                  onClick={() => exportQuestionsToPdf(topicQuestions, 'topic_questions', currentTopic?.name)}
                  className="flex items-center gap-1.5 px-3 py-1.5 hover:bg-slate-700 text-rose-300 text-xs font-bold rounded-lg transition"
                  title="Download all questions in this topic in PDF (.pdf)"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>PDF</span>
                </button>
              </div>
            )}

            <button
              onClick={() => {
                setShowUploadModal(true);
                setUploadTopicId(currentTopic?.id || topics[0]?.id || '');
                setParsedQuestions([]);
                setParseErrors([]);
              }}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              title="Upload questions via CSV, JSON, or paste"
            >
              <Upload className="w-4 h-4 text-indigo-400" />
              <span>Upload Questions</span>
            </button>

            <button
              onClick={() => {
                setShowAiModal(true);
                setGeneratedPreview(null);
              }}
              disabled={!currentTopic}
              className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/25 transition"
              title="Generate 20 questions based on topic syllabus"
            >
              <Sparkles className="w-4 h-4 text-amber-300" />
              <span>Generate Questions on Topic</span>
            </button>

            <button
              onClick={() =>
                setEditingQuestion({
                  questionText: '',
                  options: ['', '', '', ''],
                  correctOption: 0,
                  explanation: '',
                  approved: true,
                })
              }
              disabled={!currentTopic}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition"
            >
              <Plus className="w-4 h-4" />
              <span>Add Single</span>
            </button>
          </div>
        </div>

        {/* Topic Selector & Status Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-slate-300 shrink-0 flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>Active Topic:</span>
            </label>
            <select
              value={currentTopic?.id || ''}
              onChange={(e) => onSelectTopic(e.target.value)}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-indigo-500 max-w-xs truncate font-medium"
            >
              {topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <span
              className={`text-xs font-bold px-3 py-1 rounded-full border flex items-center gap-1.5 ${
                isReady
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
              }`}
            >
              {isReady ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
              <span>
                {approvedCount} / 20 Approved {isReady ? '(Quiz Ready)' : '(Need 20 for Live Quiz)'}
              </span>
            </span>

            {topicQuestions.length > 20 && (
              <button
                type="button"
                onClick={handleDeduplicateCurrentTopic}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-full text-xs font-bold transition shadow-sm"
                title="Deduplicate questions and keep exactly 20 unique questions"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Fix Pool: Clean & Keep 20 Unique</span>
              </button>
            )}

            {topicQuestions.length >= 20 && approvedCount < 20 && (
              <button
                onClick={handleBatchApproveFirst20}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold hover:underline"
              >
                Approve First 20
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Warning banner if topic has excessive or duplicate questions */}
      {topicQuestions.length > 20 && (
        <div className="p-4 bg-amber-950/40 border border-amber-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2.5 text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              This topic contains <strong>{topicQuestions.length} questions</strong>. Click Clean & Keep 20 to remove any duplicates and keep <strong>only 20 unique questions</strong>.
            </span>
          </div>
          <button
            type="button"
            onClick={handleDeduplicateCurrentTopic}
            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl transition shadow-md shrink-0 flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Clean & Keep 20 Unique</span>
          </button>
        </div>
      )}

      {/* Questions List */}
      <div className="space-y-3">
        {topicQuestions.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-3xl p-12 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center mx-auto text-indigo-400">
              <HelpCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">No questions in this topic pool yet</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
                Generate 20 comprehensive questions using AI from your topic syllabus, or upload a CSV / JSON file of questions.
              </p>
            </div>
            <div className="flex justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  setShowAiModal(true);
                  setGeneratedPreview(null);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition"
              >
                <Sparkles className="w-4 h-4 text-amber-300" />
                <span>Auto-Generate 20 Questions</span>
              </button>

              <button
                onClick={() => {
                  setShowUploadModal(true);
                  setUploadTopicId(currentTopic?.id || '');
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 transition"
              >
                <Upload className="w-4 h-4 text-indigo-400" />
                <span>Upload CSV / JSON</span>
              </button>
            </div>
          </div>
        ) : (
          topicQuestions.map((q, idx) => (
            <div
              key={q.id}
              className={`p-5 rounded-2xl border transition ${
                q.approved
                  ? 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  : 'bg-slate-900/30 border-slate-800/60 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex items-start gap-3">
                  <span className="font-mono text-xs font-extrabold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg shrink-0">
                    Q{idx + 1}
                  </span>
                  <div>
                    <h4 className="text-sm font-bold text-white leading-snug">
                      {q.questionText}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleApproval(q)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition flex items-center gap-1 ${
                      q.approved
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400 border border-slate-700'
                    }`}
                  >
                    {q.approved ? (
                      <>
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Approved</span>
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        <span>Draft</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setEditingQuestion(q)}
                    className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                    title="Edit Question"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(q.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                    title="Delete Question"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 my-3 pl-9">
                {q.options.map((opt, optIdx) => {
                  const isCorrect = optIdx === q.correctOption;
                  return (
                    <div
                      key={optIdx}
                      className={`px-3 py-2 rounded-xl text-xs flex items-center gap-2 border transition ${
                        isCorrect
                          ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200 font-semibold'
                          : 'bg-slate-800/40 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-md flex items-center justify-center font-bold text-[10px] shrink-0 ${
                          isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-slate-700 text-slate-300'
                        }`}
                      >
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span className="truncate">{opt}</span>
                    </div>
                  );
                })}
              </div>

              {q.explanation && (
                <div className="pl-9 text-[11px] text-slate-400 italic">
                  <span className="text-indigo-400 not-italic font-semibold">Explanation:</span>{' '}
                  {q.explanation}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* --- MODAL 1: AI GENERATOR MODAL --- */}
      {showAiModal && currentTopic && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowAiModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-amber-300" />
              <h3 className="text-lg font-black text-white">Generate Questions on Topic (AI)</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              AI analyzes the syllabus notes and study material of{' '}
              <strong className="text-indigo-300">&quot;{currentTopic.name}&quot;</strong> to craft balanced, 4-option multiple-choice questions.
            </p>

            {/* Config & Controls */}
            {!generatedPreview ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-700/60 space-y-2">
                  <div className="text-xs font-bold text-slate-300">Topic Information</div>
                  <div className="text-xs text-white font-semibold">{currentTopic.name}</div>
                  <p className="text-[11px] text-slate-400">{currentTopic.description}</p>
                  {currentTopic.studyMaterialText && (
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                      <Check className="w-3 h-3" />
                      <span>Study material text attached ({currentTopic.studyMaterialText.length} characters)</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    How many questions to generate?
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[5, 10, 15, 20].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGenerateCount(num)}
                        className={`py-2 text-xs font-bold rounded-xl border transition ${
                          generateCount === num
                            ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        {num} Questions {num === 20 && '(Full Pool)'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="p-3.5 bg-indigo-950/40 border border-indigo-500/30 rounded-xl space-y-1.5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-white">
                    <input
                      type="checkbox"
                      checked={replaceExistingPool}
                      onChange={(e) => setReplaceExistingPool(e.target.checked)}
                      className="accent-indigo-500 w-4 h-4 rounded cursor-pointer shrink-0"
                    />
                    <span className="font-bold">
                      Set topic pool to only {generateCount} unique questions (Replaces any old repeats)
                    </span>
                  </label>
                  <p className="text-[11px] text-slate-400 pl-6">
                    {replaceExistingPool
                      ? 'Guarantees the topic will contain only these fresh, non-repeating unique questions.'
                      : 'Appends to current pool without clearing older questions.'}
                  </p>
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowAiModal(false)}
                    className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={handleRunAiGeneration}
                    disabled={isGenerating}
                    className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                        <span>Generating {generateCount} Questions...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-amber-300" />
                        <span>Generate {generateCount} Questions Now</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              /* Generated Preview Screen */
              <div className="flex-1 flex flex-col overflow-hidden space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs pb-3 border-b border-slate-800">
                  <div>
                    <span className="font-bold text-emerald-400">
                      ✓ Successfully generated {generatedPreview.length} questions!
                    </span>
                    <span className="text-slate-400 block text-[11px]">
                      Topic: <strong className="text-slate-300">{currentTopic?.name}</strong>
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        exportQuestionsToExcel(
                          generatedPreview,
                          'ai_generated_questions',
                          currentTopic?.name
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold transition shadow-sm"
                      title="Download generated questions as Excel spreadsheet (.xlsx)"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
                      <span>Download Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        exportQuestionsToPdf(
                          generatedPreview,
                          'ai_generated_questions',
                          currentTopic?.name
                        )
                      }
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold transition shadow-sm"
                      title="Download generated questions as printable PDF document (.pdf)"
                    >
                      <FileText className="w-4 h-4 text-rose-400" />
                      <span>Download PDF</span>
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                  {generatedPreview.map((gq, i) => (
                    <div key={i} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                      <div className="font-bold text-white mb-2">
                        {i + 1}. {gq.questionText}
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pl-2 mb-2">
                        {gq.options.map((opt, oi) => (
                          <div
                            key={oi}
                            className={`p-1.5 rounded-lg border text-[11px] ${
                              oi === gq.correctOption
                                ? 'bg-emerald-950/50 border-emerald-500/50 text-emerald-300 font-semibold'
                                : 'bg-slate-900 border-slate-800 text-slate-400'
                            }`}
                          >
                            <span className="font-bold mr-1">{String.fromCharCode(65 + oi)})</span>
                            {opt}
                          </div>
                        ))}
                      </div>
                      <div className="text-[10px] text-slate-400 pl-2">
                        <strong className="text-indigo-300">Explanation:</strong> {gq.explanation}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="pt-3 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setGeneratedPreview(null)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      ← Re-generate
                    </button>
                    <label className="flex items-center gap-1.5 cursor-pointer text-[11px] text-slate-300 ml-2">
                      <input
                        type="checkbox"
                        checked={replaceExistingPool}
                        onChange={(e) => setReplaceExistingPool(e.target.checked)}
                        className="accent-indigo-500 w-3.5 h-3.5 rounded"
                      />
                      <span>Reset pool to only these {generatedPreview.length} questions</span>
                    </label>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        exportQuestionsToExcel(
                          generatedPreview,
                          'ai_generated_questions',
                          currentTopic?.name
                        )
                      }
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Excel (.xlsx)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        exportQuestionsToPdf(
                          generatedPreview,
                          'ai_generated_questions',
                          currentTopic?.name
                        )
                      }
                      className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs rounded-xl border border-slate-700 transition flex items-center gap-1.5"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF (.pdf)</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveGeneratedQuestions}
                      className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center gap-2"
                    >
                      <Check className="w-4 h-4" />
                      <span>
                        {replaceExistingPool
                          ? `Set as Topic's ${generatedPreview.length} Unique Questions`
                          : `Append ${generatedPreview.length} Questions`}
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- MODAL 2: BULK UPLOAD QUESTIONS MODAL --- */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              onClick={() => setShowUploadModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-1">
              <Upload className="w-5 h-5 text-indigo-400" />
              <h3 className="text-lg font-black text-white">Upload Questions with Topics</h3>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Import questions in bulk via CSV, JSON, or plain text Q&A format.
            </p>

            {/* Target Topic Selector */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                <span>Assign to Topic *</span>
              </label>
              <select
                value={uploadTopicId}
                onChange={(e) => setUploadTopicId(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
              >
                {topics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Mode Selector & Download Templates */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex gap-1 bg-slate-800/80 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setUploadMode('file')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    uploadMode === 'file' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  File Upload (CSV / JSON)
                </button>
                <button
                  type="button"
                  onClick={() => setUploadMode('paste')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition ${
                    uploadMode === 'paste' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Paste Text / Q&A
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={downloadSampleCsvTemplate}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                  title="Download Sample CSV"
                >
                  <Download className="w-3 h-3" />
                  <span>Sample CSV</span>
                </button>
                <span className="text-slate-600">•</span>
                <button
                  type="button"
                  onClick={downloadSampleJsonTemplate}
                  className="flex items-center gap-1 text-[11px] text-indigo-400 hover:text-indigo-300 font-medium"
                  title="Download Sample JSON"
                >
                  <Download className="w-3 h-3" />
                  <span>Sample JSON</span>
                </button>
              </div>
            </div>

            {/* File Mode */}
            {uploadMode === 'file' ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-700 hover:border-indigo-500 rounded-2xl p-6 text-center cursor-pointer bg-slate-800/40 hover:bg-slate-800/70 transition my-2"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.json,.txt"
                  onChange={handleFileChange}
                  className="hidden"
                />
                <FileSpreadsheet className="w-10 h-10 text-indigo-400 mx-auto mb-2" />
                <p className="text-xs font-bold text-white">
                  {uploadFile ? uploadFile.name : 'Click to select or drop CSV / JSON file'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Supports comma-delimited CSV, semicolon-delimited CSV, and JSON arrays.
                </p>
              </div>
            ) : (
              /* Paste Mode */
              <div className="my-2">
                <textarea
                  rows={6}
                  value={pastedText}
                  onChange={(e) => setPastedText(e.target.value)}
                  placeholder={`Paste Q&A format or JSON, e.g.:\n\n1. What is ethical AI?\nA) Fair and transparent data practices\nB) Ignoring model bias\nC) Skipping governance\nD) Unverified scraping\nAnswer: A\nExplanation: Ethical AI requires fairness and transparency.`}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-600 font-mono focus:outline-none focus:border-indigo-500"
                />
                <button
                  type="button"
                  onClick={handleParsePastedText}
                  disabled={!pastedText.trim()}
                  className="mt-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg border border-slate-700 transition"
                >
                  Parse Pasted Questions
                </button>
              </div>
            )}

            {/* Feedback / Parsed results preview */}
            {parsedQuestions.length > 0 && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-emerald-300 text-xs flex items-center justify-between my-2">
                <span className="font-bold">
                  ✓ Ready to import {parsedQuestions.length} questions into selected topic!
                </span>
                <span className="text-[11px] text-emerald-400">
                  {parsedQuestions.filter((q) => q.approved).length} marked approved
                </span>
              </div>
            )}

            {parseErrors.length > 0 && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/40 rounded-xl text-rose-300 text-xs space-y-1 my-2 max-h-24 overflow-y-auto">
                {parseErrors.map((err, idx) => (
                  <div key={idx}>⚠️ {err}</div>
                ))}
              </div>
            )}

            <div className="pt-4 flex justify-end gap-3 mt-auto">
              <button
                type="button"
                onClick={() => setShowUploadModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmUpload}
                disabled={parsedQuestions.length === 0}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition flex items-center gap-1.5"
              >
                <Upload className="w-4 h-4" />
                <span>Import {parsedQuestions.length} Questions</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL 3: SINGLE QUESTION EDIT/CREATE --- */}
      {editingQuestion && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingQuestion(null)}
              className="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-lg font-black text-white mb-1">
              {editingQuestion.id ? 'Edit Question' : 'Add New Question'}
            </h3>
            <p className="text-xs text-slate-400 mb-5">
              Topic: <strong className="text-indigo-400">{currentTopic?.name}</strong>
            </p>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Question Text *
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingQuestion.questionText || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, questionText: e.target.value })
                  }
                  placeholder="Enter the complete question prompt..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* 4 Options */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-300">
                  Multiple Choice Options (Select the correct option with radio)
                </label>
                {(editingQuestion.options || ['', '', '', '']).map((opt, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correctOption"
                      checked={(editingQuestion.correctOption ?? 0) === i}
                      onChange={() => setEditingQuestion({ ...editingQuestion, correctOption: i })}
                      className="accent-indigo-500 w-4 h-4 cursor-pointer shrink-0"
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
                      placeholder={`Option ${String.fromCharCode(65 + i)} text...`}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Explanation / Rationale
                </label>
                <textarea
                  rows={2}
                  value={editingQuestion.explanation || ''}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, explanation: e.target.value })
                  }
                  placeholder="Why is this answer correct? Explanations appear on the results breakdown."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="approvedCheck"
                  checked={editingQuestion.approved ?? true}
                  onChange={(e) =>
                    setEditingQuestion({ ...editingQuestion, approved: e.target.checked })
                  }
                  className="accent-emerald-500 rounded"
                />
                <label htmlFor="approvedCheck" className="text-xs font-semibold text-slate-300 cursor-pointer">
                  Approved for live 20-question randomized pool
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
