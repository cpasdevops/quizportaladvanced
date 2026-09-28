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
  ShieldCheck,
  Flame,
  Users,
  BookOpen,
  ListChecks,
  History,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<
    'launcher' | 'monitor' | 'topics' | 'questions' | 'history'
  >('launcher');

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
  const topicQuestions = questions.filter((q) => q.topicId === (currentTopic?.id || ''));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner & Fast Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-purple-950/70 via-indigo-950/60 to-slate-900 border border-purple-800/40 p-6 rounded-3xl shadow-2xl">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-purple-600/30 border border-purple-500/40 flex items-center justify-center text-purple-300 shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-white tracking-tight">Admin Portal</h1>
              <span className="text-[11px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/40">
                Restricted Access
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Upload PDF study material, manage 20-question pools, generate dynamic QR codes, and monitor live submissions.
            </p>
          </div>
        </div>

        {/* Live Status Chip */}
        {activeQuiz && activeQuiz.status === 'active' && (
          <div className="flex items-center gap-3 bg-emerald-950/60 border border-emerald-500/40 px-4 py-2.5 rounded-2xl shadow-lg">
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
              className="ml-2 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
            >
              Monitor →
            </button>
          </div>
        )}
      </div>

      {/* Quick Stat Counter Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Topics</span>
            <BookOpen className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-black text-white">{topics.length}</div>
          <div className="text-[10px] text-slate-500 mt-1">Syllabus modules with study notes</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Approved Questions</span>
            <ListChecks className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white">
            {questions.filter((q) => q.approved).length}{' '}
            <span className="text-xs text-slate-500 font-normal">/ {questions.length} total</span>
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Strictly 20 per quiz</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Live Active Quizzes</span>
            <Flame className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black text-amber-400">
            {quizzes.filter((q) => q.status === 'active').length}
          </div>
          <div className="text-[10px] text-slate-500 mt-1">Accepting student joins</div>
        </div>

        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase">Total Submissions</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl font-black text-purple-400">{submissionCount}</div>
          <div className="text-[10px] text-slate-500 mt-1">Saved permanently in Firebase</div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('launcher')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'launcher'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Quiz Control & QR Code</span>
        </button>

        <button
          onClick={() => setActiveTab('monitor')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'monitor'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>Live Monitor & Submissions</span>
        </button>

        <button
          onClick={() => setActiveTab('topics')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'topics'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Topics & PDF Material</span>
        </button>

        <button
          onClick={() => setActiveTab('questions')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <ListChecks className="w-4 h-4" />
          <span>Question Bank (20 Required)</span>
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            activeTab === 'history'
              ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Results & Excel Records</span>
        </button>
      </div>

      {/* Tab Panels */}
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
          questions={topicQuestions}
          onRefresh={loadAllData}
        />
      )}

      {activeTab === 'history' && <QuizHistoryAdmin />}
    </div>
  );
};
