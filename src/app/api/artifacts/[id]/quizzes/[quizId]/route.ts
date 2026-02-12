import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import type { QuizStatus } from "@/generated/prisma/client";

// Validation schema for answering a quiz
// Only accept valid quiz labels (A-F, case insensitive)
const answerQuizSchema = z.object({
  answer: z.string().regex(/^[A-F]$/i, "回答は A-F のいずれかを選択してください").transform((val) => val.toUpperCase()),
});

// Format quiz for API response
function formatQuiz(quiz: {
  id: string;
  artifactId: string;
  level: number;
  question: string;
  options: unknown;
  correctLabel: string;
  hint: string | null;
  codeSnippet: string | null;
  codeLanguage: string | null;
  status: QuizStatus;
  userAnswer: string | null;
  isCorrect: boolean | null;
  answeredAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: quiz.id,
    artifactId: quiz.artifactId,
    level: quiz.level,
    question: quiz.question,
    options: quiz.options,
    correctLabel: quiz.correctLabel,
    hint: quiz.hint,
    codeSnippet: quiz.codeSnippet,
    codeLanguage: quiz.codeLanguage,
    status: quiz.status,
    userAnswer: quiz.userAnswer,
    isCorrect: quiz.isCorrect,
    answeredAt: quiz.answeredAt?.toISOString() || null,
    createdAt: quiz.createdAt.toISOString(),
    updatedAt: quiz.updatedAt.toISOString(),
  };
}

// GET /api/artifacts/[id]/quizzes/[quizId] - Get a specific quiz
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "認証が必要です" },
        },
        { status: 401 }
      );
    }

    const { id: artifactId, quizId } = await params;

    // Verify artifact ownership
    const artifact = await prisma.artifact.findFirst({
      where: {
        id: artifactId,
        userId: session.user.id,
      },
    });

    if (!artifact) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "アーティファクトが見つかりません" },
        },
        { status: 404 }
      );
    }

    // Get the quiz
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        artifactId,
      },
    });

    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "クイズが見つかりません" },
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: formatQuiz(quiz),
    });
  } catch (error) {
    console.error("Get quiz error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "クイズの取得に失敗しました" },
      },
      { status: 500 }
    );
  }
}

// PATCH /api/artifacts/[id]/quizzes/[quizId] - Answer a quiz
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; quizId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "UNAUTHORIZED", message: "認証が必要です" },
        },
        { status: 401 }
      );
    }

    const { id: artifactId, quizId } = await params;

    // Verify artifact ownership
    const artifact = await prisma.artifact.findFirst({
      where: {
        id: artifactId,
        userId: session.user.id,
      },
    });

    if (!artifact) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "アーティファクトが見つかりません" },
        },
        { status: 404 }
      );
    }

    // Parse request body
    const body = await request.json();
    const parsed = answerQuizSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "入力形式が正しくありません",
            details: parsed.error.issues,
          },
        },
        { status: 400 }
      );
    }

    const { answer } = parsed.data;

    // Get the quiz
    const quiz = await prisma.quiz.findFirst({
      where: {
        id: quizId,
        artifactId,
      },
    });

    if (!quiz) {
      return NextResponse.json(
        {
          success: false,
          error: { code: "NOT_FOUND", message: "クイズが見つかりません" },
        },
        { status: 404 }
      );
    }

    // Check if already answered
    if (quiz.status === "answered") {
      return NextResponse.json(
        {
          success: false,
          error: { code: "ALREADY_ANSWERED", message: "このクイズは既に回答済みです" },
        },
        { status: 400 }
      );
    }

    // Check answer
    const isCorrect = answer.toUpperCase() === quiz.correctLabel.toUpperCase();

    // Update quiz
    const updatedQuiz = await prisma.quiz.update({
      where: { id: quizId },
      data: {
        status: "answered",
        userAnswer: answer.toUpperCase(),
        isCorrect,
        answeredAt: new Date(),
      },
    });

    // Get all quizzes to check completion status
    const allQuizzes = await prisma.quiz.findMany({
      where: { artifactId },
      orderBy: { level: "asc" },
    });

    const answeredCorrectly = allQuizzes.filter(
      (q) => q.status === "answered" && q.isCorrect
    ).length;
    const totalQuestions = allQuizzes.length;
    const isUnlocked = answeredCorrectly >= totalQuestions;

    // Update artifact unlock level
    await prisma.artifact.update({
      where: { id: artifactId },
      data: {
        unlockLevel: answeredCorrectly,
      },
    });

    // Find next pending quiz
    const nextQuiz = allQuizzes.find((q) => q.status === "pending");

    return NextResponse.json({
      success: true,
      data: {
        quiz: formatQuiz(updatedQuiz),
        isCorrect,
        currentLevel: answeredCorrectly,
        totalQuestions,
        isUnlocked,
        nextQuiz: nextQuiz ? formatQuiz(nextQuiz) : null,
      },
    });
  } catch (error) {
    console.error("Answer quiz error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "回答の送信に失敗しました" },
      },
      { status: 500 }
    );
  }
}
