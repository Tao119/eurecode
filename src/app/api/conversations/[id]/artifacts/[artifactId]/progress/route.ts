import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";

// Validation schema for updating progress
const updateProgressSchema = z.object({
  unlockLevel: z.number().int().min(0).optional(),
  totalQuestions: z.number().int().min(0).max(10).optional(),
  currentQuiz: z.object({
    level: z.number(),
    question: z.string(),
    options: z.array(z.object({
      label: z.string(),
      text: z.string(),
    })),
    correctLabel: z.string(),
    hint: z.string().optional(),
  }).nullable().optional(),
  quizHistoryItem: z.object({
    level: z.number(),
    question: z.string(),
    userAnswer: z.string(),
    isCorrect: z.boolean(),
  }).optional(),
});

// PATCH /api/conversations/[id]/artifacts/[artifactId]/progress
// Update artifact quiz progress
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; artifactId: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "認証が必要です" } },
        { status: 401 }
      );
    }

    const { id: conversationId, artifactId } = await params;
    const body = await request.json();
    const validated = updateProgressSchema.parse(body);

    // Find the artifact and verify ownership
    const artifact = await prisma.artifact.findFirst({
      where: {
        id: artifactId,
        conversationId,
        userId: session.user.id,
      },
    });

    if (!artifact) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "アーティファクトが見つかりません" } },
        { status: 404 }
      );
    }

    // Build update data
    const updateData: Prisma.ArtifactUpdateInput = {};

    if (validated.unlockLevel !== undefined) {
      updateData.unlockLevel = validated.unlockLevel;
    }

    if (validated.totalQuestions !== undefined) {
      updateData.totalQuestions = validated.totalQuestions;
    }

    if (validated.currentQuiz !== undefined) {
      updateData.currentQuiz = validated.currentQuiz as Prisma.InputJsonValue;
    }

    // Append to quiz history if provided
    if (validated.quizHistoryItem) {
      const currentHistory = (artifact.quizHistory as unknown[]) || [];
      updateData.quizHistory = [...currentHistory, validated.quizHistoryItem] as Prisma.InputJsonValue;
    }

    // Update artifact
    const updated = await prisma.artifact.update({
      where: { id: artifactId },
      data: updateData,
    });

    // Calculate progress
    const totalQuestions = validated.totalQuestions ?? updated.totalQuestions;
    const unlockLevel = validated.unlockLevel ?? updated.unlockLevel;
    const isUnlocked = totalQuestions === 0 || unlockLevel >= totalQuestions;
    const progressPercentage = totalQuestions > 0
      ? Math.round((unlockLevel / totalQuestions) * 100)
      : 100;

    return NextResponse.json({
      success: true,
      data: {
        unlockLevel: updated.unlockLevel,
        totalQuestions: updated.totalQuestions,
        currentQuiz: updated.currentQuiz,
        quizHistory: updated.quizHistory || [],
        isUnlocked,
        progressPercentage,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "入力が不正です", details: error.issues } },
        { status: 400 }
      );
    }

    console.error("Update progress error:", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: "進捗の更新に失敗しました" } },
      { status: 500 }
    );
  }
}
