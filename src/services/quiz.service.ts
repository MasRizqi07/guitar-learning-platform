import { prisma } from '@/lib/db';
import { QuizRepository } from '@/repositories/quiz.repository';
import { calculateQuizScore, isQuizPassed } from '@/domain/quiz-evaluator';
import { XP_VALUES } from '@/config/constants';
import { AppError } from '@/lib/errors';
import { XPTransactionType, ActivityType } from '@prisma/client';

export interface UserSubmittedAnswer {
  questionId: string;
  selectedOptionId: string;
}

export class QuizService {
  /**
   * Starts a new quiz attempt and returns questions WITHOUT revealing isCorrect fields.
   */
  static async startAttempt(userId: string, quizId: string) {
    const quiz = await QuizRepository.getQuizById(quizId);
    if (!quiz) {
      throw AppError.notFound('QUIZ_NOT_FOUND', 'Quiz not found');
    }

    const attempt = await QuizRepository.createAttempt(userId, quiz.id, quiz.questions.length);

    // Sanitize questions: strip isCorrect
    const sanitizedQuestions = quiz.questions.map((q) => ({
      id: q.id,
      type: q.type,
      prompt: q.prompt,
      order: q.order,
      options: q.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        order: opt.order,
      })),
    }));

    return {
      attemptId: attempt.id,
      quiz: {
        id: quiz.id,
        title: quiz.title,
        description: quiz.description,
        passingScore: quiz.passingScore,
        lesson: quiz.lesson,
        totalQuestions: quiz.questions.length,
      },
      questions: sanitizedQuestions,
    };
  }

  /**
   * Server evaluates answers, calculates score, updates attempt, and awards XP.
   */
  static async submitAttempt(
    userId: string,
    attemptId: string,
    submittedAnswers: UserSubmittedAnswer[]
  ) {
    const attempt = await QuizRepository.getAttempt(attemptId);
    if (!attempt) {
      throw AppError.notFound('QUIZ_ATTEMPT_NOT_FOUND', 'Quiz attempt not found');
    }

    if (attempt.userId !== userId) {
      throw AppError.forbidden('You do not have access to this quiz attempt');
    }

    if (attempt.completedAt) {
      throw new AppError('QUIZ_ALREADY_SUBMITTED', 'This quiz attempt has already been submitted', 400);
    }

    const quiz = attempt.quiz;
    let correctCount = 0;
    const questionsReview: {
      questionId: string;
      prompt: string;
      explanation?: string | null;
      selectedOptionId: string;
      correctOptionId: string;
      isCorrect: boolean;
    }[] = [];

    const answerRecordsToCreate: {
      quizAttemptId: string;
      questionId: string;
      selectedAnswerOptionId: string;
      isCorrect: boolean;
    }[] = [];

    // Map answers and score server-side
    const answerMap = new Map<string, string>();
    for (const a of submittedAnswers) {
      answerMap.set(a.questionId, a.selectedOptionId);
    }

    for (const question of quiz.questions) {
      const selectedOptionId = answerMap.get(question.id) || '';
      const correctOption = question.options.find((opt) => opt.isCorrect);
      const isCorrect = correctOption?.id === selectedOptionId;

      if (isCorrect) {
        correctCount++;
      }

      answerRecordsToCreate.push({
        quizAttemptId: attempt.id,
        questionId: question.id,
        selectedAnswerOptionId: selectedOptionId,
        isCorrect,
      });

      questionsReview.push({
        questionId: question.id,
        prompt: question.prompt,
        explanation: question.explanation,
        selectedOptionId,
        correctOptionId: correctOption?.id || '',
        isCorrect,
      });
    }

    const totalQuestions = quiz.questions.length;
    const score = calculateQuizScore(correctCount, totalQuestions);
    const passed = isQuizPassed(score, quiz.passingScore);

    return prisma.$transaction(async (tx) => {
      // 1. Save all attempt answers
      for (const rec of answerRecordsToCreate) {
        await tx.quizAttemptAnswer.create({ data: rec });
      }

      // 2. Mark attempt completed
      const updatedAttempt = await tx.quizAttempt.update({
        where: { id: attempt.id },
        data: {
          score,
          correctAnswers: correctCount,
          passed,
          completedAt: new Date(),
        },
      });

      // 3. Award XP if passed
      let xpAwarded = 0;
      if (passed) {
        // Quiz completed XP (awarded once per quiz)
        const quizKey = `quiz-completed:${userId}:${quiz.id}`;
        const existingQuizXP = await tx.xPTransaction.findUnique({
          where: { idempotencyKey: quizKey },
        });

        if (!existingQuizXP) {
          xpAwarded += XP_VALUES.QUIZ_COMPLETE;
          await tx.xPTransaction.create({
            data: {
              userId,
              type: XPTransactionType.QUIZ_COMPLETED,
              amount: XP_VALUES.QUIZ_COMPLETE,
              referenceType: 'QUIZ',
              referenceId: quiz.id,
              idempotencyKey: quizKey,
            },
          });
        }

        // Perfect Quiz bonus XP (if 100% and not previously awarded)
        if (score === 100) {
          const perfectKey = `perfect-quiz:${userId}:${quiz.id}`;
          const existingPerfectXP = await tx.xPTransaction.findUnique({
            where: { idempotencyKey: perfectKey },
          });

          if (!existingPerfectXP) {
            xpAwarded += XP_VALUES.PERFECT_QUIZ;
            await tx.xPTransaction.create({
              data: {
                userId,
                type: XPTransactionType.PERFECT_QUIZ,
                amount: XP_VALUES.PERFECT_QUIZ,
                referenceType: 'QUIZ',
                referenceId: quiz.id,
                idempotencyKey: perfectKey,
              },
            });
          }
        }

        if (xpAwarded > 0) {
          await tx.profile.update({
            where: { userId },
            data: { totalXP: { increment: xpAwarded } },
          });
        }
      }

      // 4. Log Learning Activity
      await tx.learningActivity.create({
        data: {
          userId,
          type: ActivityType.QUIZ_COMPLETED,
          entityType: 'QUIZ_ATTEMPT',
          entityId: attempt.id,
          metadata: {
            quizId: quiz.id,
            score,
            passed,
            correctCount,
            totalQuestions,
          },
        },
      });

      return {
        attempt: updatedAttempt,
        score,
        correctCount,
        totalQuestions,
        passed,
        passingScore: quiz.passingScore,
        xpAwarded,
        review: questionsReview,
      };
    });
  }
}
