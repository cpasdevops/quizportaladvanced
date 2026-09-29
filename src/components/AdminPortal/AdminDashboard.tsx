import React, { useState, useEffect } from 'react';
import { Quiz, Topic, Question } from '../../types/quiz';
import {
  fetchQuizzes,
  fetchTopics,
  fetchQuestions,
  fetchResults,
} from '../../firebase/service';
import { TopicManager } from './TopicManager';
import { QuestionManager } from './QuestionManager';
import { QuizLauncher } from './QuizLauncher';
import { LiveMonitor } from './LiveMonitor';
import { QuizHistoryAdmin } from './QuizHistoryAdmin';
import {
  BookOpen,
  ListChecks,
  Flame,
  Users,
  ShieldCheck,
  History,
  Activity,
  Layers,
  Sparkles,
  ArrowRight,
  Upload,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'topics' | 'questions' | 'launcher' | 'monitor' | 'history'
  >('topics');

  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [selectedTopicId, setSelectedTopicId] = useState<string>('');
  const [submissionCount, setSubmissionCount] = useState<number>(0);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    const [fetchedQuizzes, fetchedTopics, fetchedQuestions, fetchedResults] = await Promise.all([
      fetchQuizzes(),
      fetchTopics(),
      fetchQuestions(),
      fetchResults(),
    ]);

    setQuizzes(fetchedQuizzes);
    setTopics(fetchedTopics);
    setQuestions(fetchedQuestions);
    setSubmissionCount(fetchedResults.length);

    // Pick active quiz if any, or latest
    const live = fetchedQuizzes.find((q) => q.status === 'active') || fetchedQuizzes[0] || null;
    setActiveQuiz(live);

    if (fetchedTopics.length > 0 && !selectedTopicId) {
      setSelectedTopicId(fetchedTopics[0].id);
    }
  };

  const currentTopic = topics.find((t) => t.id === selectedTopicId) || topics[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Fast Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-slate-900 border border-purple-800/40 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner shrink-0">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight">Admin Portal</h1>
              <span className="text-[11px] font-extrabold uppercase px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Authoritative Management
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Organized 5-step workflow: Create topics, upload & generate questions, launch QR-coded sessions, and monitor live test results.
            </p>
          </div>
        </div>

        {/* Live Status Chip */}
        {activeQuiz && activeQuiz.status === 'active' && (
          <div className="flex items-center gap-3 bg-emerald-950/70 border border-emerald-500/50 px-4 py-2.5 rounded-2xl shadow-lg shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <div>
              <div className="text-[10px] text-emerald-300 font-bold uppercase tracking-wider">
                Live Quiz Running
              </div>
              <div className="font-mono text-sm font-black text-white">
                Code: {activeQuiz.code}
              </div>
            </div>
            <button
              onClick={() => setActiveTab('monitor')}
              className="ml-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md transition"
            >
              Monitor →
            </button>
          </div>
        )}
      </div>

      {/* Quick Stat Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div
          onClick={() => setActiveTab('topics')}
          className="p-4 bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 rounded-2xl cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">1. Topics</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{topics.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">Syllabus modules with study notes</div>
        </div>

        <div
          onClick={() => setActiveTab('questions')}
          className="p-4 bg-slate-900/60 border border-slate-800 hover:border-emerald-500/50 rounded-2xl cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">2. Questions Bank</span>
            <ListChecks className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {questions.filter((q) => q.approved).length}{' '}
            <span className="text-xs text-slate-500 font-normal">/ {questions.length} total</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Upload CSV or generate with AI</div>
        </div>

        <div
          onClick={() => setActiveTab('launcher')}
          className="p-4 bg-slate-900/60 border border-slate-800 hover:border-amber-500/50 rounded-2xl cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">3. Live Sessions</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {quizzes.filter((q) => q.status === 'active').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Controlled manually by admin</div>
        </div>

        <div
          onClick={() => setActiveTab('history')}
          className="p-4 bg-slate-900/60 border border-slate-800 hover:border-purple-500/50 rounded-2xl cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">5. Submissions</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">{submissionCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Exportable to Excel / CSV</div>
        </div>
      </div>

      {/* Sequential & Manageable Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-800">
        {/* Step 1 */}
        <button
          onClick={() => setActiveTab('topics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'topics'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/25 flex items-center justify-center text-[10px] font-black">
            1
          </span>
          <BookOpen className="w-4 h-4" />
          <span>Topics & PDFs</span>
        </button>

        {/* Step 2 */}
        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/25 flex items-center justify-center text-[10px] font-black">
            2
          </span>
          <ListChecks className="w-4 h-4" />
          <span>Questions (Upload & AI Generate)</span>
        </button>

        {/* Step 3 */}
        <button
          onClick={() => setActiveTab('launcher')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'launcher'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/25 flex items-center justify-center text-[10px] font-black">
            3
          </span>
          <Flame className="w-4 h-4" />
          <span>Quiz Launch & QR Code</span>
        </button>

        {/* Step 4 */}
        <button
          onClick={() => setActiveTab('monitor')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'monitor'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/25 flex items-center justify-center text-[10px] font-black">
            4
          </span>
          <Activity className="w-4 h-4" />
          <span>Live Monitor</span>
        </button>

        {/* Step 5 */}
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-black/25 flex items-center justify-center text-[10px] font-black">
            5
          </span>
          <History className="w-4 h-4" />
          <span>Results & Analytics</span>
        </button>
      </div>

      {/* Tab Panels in Sequential Pipeline */}
      {activeTab === 'topics' && (
        <TopicManager
          topics={topics}
          selectedTopicId={selectedTopicId}
          onSelectTopic={(id) => {
            setSelectedTopicId(id);
            setActiveTab('questions');
          }}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'questions' && (
        <QuestionManager
          currentTopic={currentTopic}
          topics={topics}
          questions={questions}
          onSelectTopic={(id) => setSelectedTopicId(id)}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'launcher' && (
        <QuizLauncher
          currentQuiz={activeQuiz}
          topics={topics}
          questions={questions}
          onQuizChange={(q) => setActiveQuiz(q)}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'monitor' && (
        <LiveMonitor currentQuiz={activeQuiz} onRefresh={loadAllData} />
      )}

      {activeTab === 'history' && <QuizHistoryAdmin />}
    </div>
  );
};
