'use client';

import React, { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { CheckCircle2, XCircle, Sparkles, RotateCcw, ArrowRight } from 'lucide-react';

interface QuestionOption {
  id: string;
  text: string;
  order: number;
}

interface QuestionItem {
  id: string;
  type: string;
  prompt: string;
  order: number;
  options: QuestionOption[];
}

interface QuizStartData {
  attemptId: string;
  quiz: {
    id: string;
    title: string;
    description: string;
    passingScore: number;
    lesson: {
      id: string;
      title: string;
      slug: string;
      order: number;
    };
    totalQuestions: number;
  };
  questions: QuestionItem[];
}

interface QuestionReview {
  questionId: string;
  prompt: string;
  explanation?: string | null;
  selectedOptionId: string;
  correctOptionId: string;
  isCorrect: boolean;
}

interface QuizResultData {
  score: number;
  correctCount: number;
  totalQuestions: number;
  passed: boolean;
  passingScore: number;
  xpAwarded: number;
  review: QuestionReview[];
}

export default function QuizPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: quizId } = use(params);

  const [startData, setStartData] = useState<QuizStartData | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<QuizResultData | null>(null);
  const [lessonCompletion, setLessonCompletion] = useState<{
    alreadyCompleted: boolean;
    xpAwarded: number;
    unlockedAchievements: string[];
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    fetch(`/api/quizzes/${quizId}/start`, { method: 'POST' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message || 'Failed to start quiz');
        return body.data;
      })
      .then((data: QuizStartData) => {
        if (!isCancelled) {
          setStartData(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!isCancelled) {
          setError(err instanceof Error ? err.message : 'Error starting quiz');
          setIsLoading(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [quizId]);

  const handleRetry = () => {
    setIsLoading(true);
    setError(null);
    setResult(null);
    setSelectedAnswers({});

    fetch(`/api/quizzes/${quizId}/start`, { method: 'POST' })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error?.message || 'Failed to start quiz');
        return body.data;
      })
      .then((data: QuizStartData) => {
        setStartData(data);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Error starting quiz');
      })
      .finally(() => setIsLoading(false));
  };

  const selectOption = (questionId: string, optionId: string) => {
    if (result) return; // Prevent change after submit
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionId }));
  };

  const handleSubmit = async () => {
    if (!startData) return;
    setIsSubmitting(true);
    setError(null);

    const answersPayload = Object.entries(selectedAnswers).map(([questionId, selectedOptionId]) => ({
      questionId,
      selectedOptionId,
    }));

    try {
      const res = await fetch(`/api/quizzes/attempts/${startData.attemptId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: answersPayload }),
      });

      const body = await res.json();
      if (!res.ok) throw new Error(body.error?.message || 'Failed to submit quiz');
      setResult(body.data);

      // If quiz passed, automatically complete the lesson and award lesson XP/achievements
      if (body.data.passed && startData.quiz.lesson?.id) {
        try {
          const compRes = await fetch(`/api/lessons/${startData.quiz.lesson.id}/complete`, {
            method: 'POST',
          });
          const compJson = await compRes.json();
          if (compRes.ok && compJson.data) {
            setLessonCompletion(compJson.data);
          }
        } catch (e) {
          console.error('Lesson completion call failed:', e);
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to submit answers');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-[#171A20] rounded-xl w-48" />
        <div className="h-64 bg-[#171A20] rounded-2xl" />
      </div>
    );
  }

  if (error || !startData) {
    return (
      <Card className="max-w-md mx-auto p-8 text-center space-y-4 border-red-500/30">
        <div className="text-3xl">⚠️</div>
        <h2 className="text-xl font-bold text-slate-100">Unable to load quiz</h2>
        <p className="text-sm text-slate-400">{error}</p>
        <Button onClick={handleRetry}>Retry</Button>
      </Card>
    );
  }

  const { quiz, questions } = startData;
  const allAnswered = questions.every((q) => selectedAnswers[q.id]);

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Quiz Header */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Link
            href={`/lessons/${quiz.lesson.slug}`}
            className="text-xs font-semibold text-slate-400 hover:text-slate-200"
          >
            ← Back to Lesson #{quiz.lesson.order}
          </Link>
          <Badge variant="primary" size="sm">
            Passing: {quiz.passingScore}%
          </Badge>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-100">{quiz.title}</h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">{quiz.description}</p>
        </div>
      </div>

      {/* Result Banner (if submitted) */}
      {result && (
        <Card
          className={`p-6 sm:p-8 text-center space-y-4 border ${
            result.passed ? 'bg-emerald-500/10 border-emerald-500/40' : 'bg-red-500/10 border-red-500/40'
          }`}
        >
          <div className="text-4xl">{result.passed ? '🎉' : '❌'}</div>
          <div>
            <h2 className="text-2xl font-bold text-slate-100">
              {result.passed ? 'Quiz Passed!' : 'Needs More Practice'}
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              You scored <span className="font-bold text-amber-400">{result.score}%</span> ({result.correctCount} of {result.totalQuestions} correct).
            </p>
          </div>

          {result.passed && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              {result.xpAwarded > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 font-bold text-xs border border-amber-500/40">
                  <Sparkles className="w-3.5 h-3.5" /> +{result.xpAwarded} Quiz XP
                </div>
              )}
              {lessonCompletion && lessonCompletion.xpAwarded > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-bold text-xs border border-emerald-500/40">
                  <CheckCircle2 className="w-3.5 h-3.5" /> +{lessonCompletion.xpAwarded} Lesson XP
                </div>
              )}
              {lessonCompletion && lessonCompletion.unlockedAchievements?.length > 0 && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/20 text-purple-300 font-bold text-xs border border-purple-500/40">
                  🏆 Unlocked: {lessonCompletion.unlockedAchievements.join(', ')}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-3 pt-2">
            {!result.passed && (
              <Button onClick={handleRetry} variant="secondary" className="gap-2">
                <RotateCcw className="w-4 h-4" /> Retry Quiz
              </Button>
            )}
            <Link href="/learn">
              <Button className="gap-1.5 font-bold bg-amber-500 hover:bg-amber-400 text-slate-950">
                Continue to Roadmap <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </Card>
      )}

      {/* Questions List */}
      <div className="space-y-6">
        {questions.map((q, qIndex) => {
          const review = result?.review.find((r) => r.questionId === q.id);

          return (
            <Card
              key={q.id}
              className={`p-6 border transition-all ${
                review
                  ? review.isCorrect
                    ? 'border-emerald-500/50 bg-emerald-500/5'
                    : 'border-red-500/50 bg-red-500/5'
                  : 'border-[#2A303A]'
              }`}
            >
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xs font-bold text-amber-400">
                    Question {qIndex + 1} of {questions.length}
                  </span>
                  {review && (
                    <span className={`text-xs font-bold flex items-center gap-1 ${
                      review.isCorrect ? 'text-emerald-400' : 'text-red-400'
                    }`}>
                      {review.isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" /> Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5" /> Incorrect
                        </>
                      )}
                    </span>
                  )}
                </div>

                <p className="text-sm sm:text-base font-semibold text-slate-100">{q.prompt}</p>

                {/* Options */}
                <div className="space-y-2">
                  {q.options.map((opt) => {
                    const isSelected = selectedAnswers[q.id] === opt.id;
                    const isCorrectOption = review?.correctOptionId === opt.id;
                    const isSelectedWrong = review && isSelected && !review.isCorrect;

                    let optionStyle = 'bg-[#121418] border-[#2A303A] text-slate-300 hover:border-slate-500';
                    if (review) {
                      if (isCorrectOption) {
                        optionStyle = 'bg-emerald-500/20 border-emerald-500 text-emerald-200 font-semibold';
                      } else if (isSelectedWrong) {
                        optionStyle = 'bg-red-500/20 border-red-500 text-red-300 font-semibold line-through';
                      } else {
                        optionStyle = 'bg-[#121418] border-[#2A303A] text-slate-500 opacity-60';
                      }
                    } else if (isSelected) {
                      optionStyle = 'bg-amber-500/10 border-amber-500 text-slate-100 font-medium';
                    }

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        disabled={Boolean(result)}
                        onClick={() => selectOption(q.id, opt.id)}
                        className={`w-full p-3.5 rounded-xl border text-left text-sm transition-all flex items-center justify-between ${optionStyle}`}
                      >
                        <span>{opt.text}</span>
                        {isSelected && !review && <span className="text-amber-400">✓</span>}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation note displayed after submission */}
                {review && review.explanation && (
                  <div className="p-3.5 rounded-xl bg-[#20242C] border border-[#2A303A] text-xs text-slate-300 mt-2">
                    💡 <strong>Explanation:</strong> {review.explanation}
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Submit Action */}
      {!result && (
        <div className="pt-2">
          <Button
            onClick={handleSubmit}
            disabled={!allAnswered || isSubmitting}
            isLoading={isSubmitting}
            size="lg"
            className="w-full font-bold"
          >
            {allAnswered ? 'Submit Answers & Calculate Score' : 'Answer All Questions to Submit'}
          </Button>
        </div>
      )}
    </div>
  );
}
