import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  generateQuizzesForArtifact,
  generateFallbackQuizzes,
} from "@/lib/quiz-generator-server";
import type { QuizStatus } from "@/generated/prisma/client";

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

// GET /api/artifacts/[id]/quizzes - List all quizzes for an artifact
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: artifactId } = await params;

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

    // Get all quizzes for this artifact
    const quizzes = await prisma.quiz.findMany({
      where: { artifactId },
      orderBy: { level: "asc" },
    });

    // Calculate current level (next unanswered quiz)
    const answeredCorrectly = quizzes.filter(
      (q) => q.status === "answered" && q.isCorrect
    ).length;
    const totalQuestions = quizzes.length;
    const isUnlocked = totalQuestions === 0 || answeredCorrectly >= totalQuestions;

    // Find next pending quiz
    const nextQuiz = quizzes.find((q) => q.status === "pending");

    return NextResponse.json({
      success: true,
      data: {
        items: quizzes.map(formatQuiz),
        total: totalQuestions,
        currentLevel: answeredCorrectly + 1,
        isUnlocked,
        nextQuizId: nextQuiz?.id || null,
      },
    });
  } catch (error) {
    console.error("Get quizzes error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "クイズの取得に失敗しました" },
      },
      { status: 500 }
    );
  }
}

// POST /api/artifacts/[id]/quizzes - Generate quizzes for an artifact
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: artifactId } = await params;

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

    // Check if quizzes already exist
    const existingQuizzes = await prisma.quiz.count({
      where: { artifactId },
    });

    if (existingQuizzes > 0) {
      // Return existing quizzes instead of regenerating
      const quizzes = await prisma.quiz.findMany({
        where: { artifactId },
        orderBy: { level: "asc" },
      });

      const answeredCorrectly = quizzes.filter(
        (q) => q.status === "answered" && q.isCorrect
      ).length;

      return NextResponse.json({
        success: true,
        data: {
          items: quizzes.map(formatQuiz),
          total: quizzes.length,
          currentLevel: answeredCorrectly + 1,
          isUnlocked: answeredCorrectly >= quizzes.length,
          generated: false,
          message: "クイズは既に生成されています",
        },
      });
    }

    // Generate quizzes using AI
    // Use the artifact's totalQuestions if available, otherwise estimateQuizCount will calculate it
    let generatedQuizzes = await generateQuizzesForArtifact({
      code: artifact.content,
      language: artifact.language || "javascript",
      title: artifact.title,
      estimatedCount: artifact.totalQuestions > 0 ? artifact.totalQuestions : undefined,
    });

    // If AI generation fails, use fallback
    if (generatedQuizzes.length === 0) {
      generatedQuizzes = generateFallbackQuizzes(
        artifact.content,
        artifact.language || "javascript"
      );
    }

    // If still no quizzes, return empty (code is too simple)
    if (generatedQuizzes.length === 0) {
      // Update artifact to be unlocked
      await prisma.artifact.update({
        where: { id: artifactId },
        data: {
          totalQuestions: 0,
          unlockLevel: 0,
        },
      });

      return NextResponse.json({
        success: true,
        data: {
          items: [],
          total: 0,
          currentLevel: 0,
          isUnlocked: true,
          generated: true,
          message: "コードがシンプルなため、クイズは生成されませんでした",
        },
      });
    }

    // Create quizzes in database
    const createdQuizzes = await prisma.$transaction(
      generatedQuizzes.map((quiz) =>
        prisma.quiz.create({
          data: {
            artifactId,
            level: quiz.level,
            question: quiz.question,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            options: quiz.options as any,
            correctLabel: quiz.correctLabel,
            hint: quiz.hint || null,
            codeSnippet: quiz.codeSnippet || null,
            codeLanguage: quiz.codeLanguage || artifact.language || null,
            status: "pending",
          },
        })
      )
    );

    // Update artifact with total questions
    await prisma.artifact.update({
      where: { id: artifactId },
      data: {
        totalQuestions: createdQuizzes.length,
        unlockLevel: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        items: createdQuizzes.map(formatQuiz),
        total: createdQuizzes.length,
        currentLevel: 1,
        isUnlocked: false,
        generated: true,
        nextQuizId: createdQuizzes[0]?.id || null,
      },
    });
  } catch (error) {
    console.error("Generate quizzes error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "クイズの生成に失敗しました" },
      },
      { status: 500 }
    );
  }
}

// DELETE /api/artifacts/[id]/quizzes - Delete all quizzes and regenerate
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
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

    const { id: artifactId } = await params;

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

    // Delete all quizzes for this artifact
    await prisma.quiz.deleteMany({
      where: { artifactId },
    });

    // Reset artifact progress
    await prisma.artifact.update({
      where: { id: artifactId },
      data: {
        unlockLevel: 0,
        totalQuestions: 0,
      },
    });

    return NextResponse.json({
      success: true,
      data: { message: "クイズを削除しました" },
    });
  } catch (error) {
    console.error("Delete quizzes error:", error);
    return NextResponse.json(
      {
        success: false,
        error: { code: "INTERNAL_ERROR", message: "クイズの削除に失敗しました" },
      },
      { status: 500 }
    );
  }
}
