import React, { useState, useEffect } from 'react';
import { Quiz, QuizResult, Question } from '../../types/quiz';
import { fetchQuestions } from '../../firebase/service';
import { useAuth } from '../../context/AuthContext';
import { StudentJoin } from './StudentJoin';
import { WaitingLobby } from './WaitingLobby';
import { QuizInstructions } from './QuizInstructions';
import { QuizPlayer } from './QuizPlayer';
import { QuizResultView } from './QuizResultView';
import { StudentHistory } from './StudentHistory';

export const StudentPortal: React.FC = () => {
  const { user } = useAuth();
  const [viewState, setViewState] = useState<'join' | 'waiting' | 'instructions' | 'playing' | 'result' | 'history'>('join');
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [candidateName, setCandidateName] = useState(user?.displayName || '');
  const [candidateEmail, setCandidateEmail] = useState(user?.email || '');
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [completedResult, setCompletedResult] = useState<QuizResult | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    const list = await fetchQuestions();
    setAllQuestions(list);
  };

  const handleJoinSuccess = (quiz: Quiz, name: string, email?: string) => {
    setActiveQuiz(quiz);
    setCandidateName(name);
    setCandidateEmail(email || '');

    if (quiz.questionsList && quiz.questionsList.length > 0) {
      setAllQuestions((prev) => {
        const map = new Map<string, Question>(prev.map((q) => [q.id, q]));
        for (const q of quiz.questionsList!) {
          map.set(q.id, q);
        }
        return Array.from(map.values());
      });
    }

    // If admin hasn't started the quiz yet, place student in the Waiting Lobby!
    if (quiz.status === 'draft') {
      setViewState('waiting');
    } else {
      setViewState('instructions');
    }
  };

  const handleQuizActivatedByAdmin = (activatedQuiz: Quiz) => {
    setActiveQuiz(activatedQuiz);
    if (activatedQuiz.questionsList && activatedQuiz.questionsList.length > 0) {
      setAllQuestions((prev) => {
        const map = new Map<string, Question>(prev.map((q) => [q.id, q]));
        for (const q of activatedQuiz.questionsList!) {
          map.set(q.id, q);
        }
        return Array.from(map.values());
      });
    }
    setViewState('instructions');
  };

  const handleStartQuiz = () => {
    setViewState('playing');
  };

  const handleQuizSubmitted = (result: QuizResult) => {
    setCompletedResult(result);
    setViewState('result');
  };

  const handleInspectHistoricalResult = (result: QuizResult) => {
    setCompletedResult(result);
    setViewState('result');
  };

  return (
    <div className="w-full min-h-[calc(100vh-4rem)] bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950">
      {viewState === 'join' && (
        <StudentJoin
          onJoinSuccess={handleJoinSuccess}
          onGoToHistory={() => setViewState('history')}
        />
      )}

      {viewState === 'waiting' && activeQuiz && (
        <WaitingLobby
          quiz={activeQuiz}
          studentName={candidateName}
          onQuizActivated={handleQuizActivatedByAdmin}
          onLeave={() => setViewState('join')}
        />
      )}

      {viewState === 'instructions' && activeQuiz && (
        <QuizInstructions
          quiz={activeQuiz}
          studentName={candidateName}
          onStartQuiz={handleStartQuiz}
          onBack={() => setViewState('join')}
        />
      )}

      {viewState === 'playing' && activeQuiz && (
        <QuizPlayer
          quiz={activeQuiz}
          questions={allQuestions}
          studentName={candidateName}
          studentEmail={candidateEmail}
          studentId={user?.uid || 'stu-' + candidateName.toLowerCase().replace(/\s+/g, '')}
          onQuizSubmitted={handleQuizSubmitted}
        />
      )}

      {viewState === 'result' && completedResult && (
        <QuizResultView
          result={completedResult}
          onTakeAnother={() => {
            setActiveQuiz(null);
            setCompletedResult(null);
            setViewState('join');
          }}
          onViewHistory={() => setViewState('history')}
        />
      )}

      {viewState === 'history' && (
        <StudentHistory
          onBackToJoin={() => setViewState('join')}
          onInspectResult={handleInspectHistoricalResult}
        />
      )}
    </div>
  );
};
