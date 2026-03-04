"use client";

import { useCallback } from "react";
import { GenerationQuiz } from "./GenerationQuiz";
import { Button } from "@/components/ui/button";
import type { UnlockQuiz, QuizHistoryItem } from "@/hooks/useArtifactQuiz";
import type { Artifact } from "@/types/chat";

// --- Shared helper: build quiz explanation request message ---

export function buildQuizExplanationMessage(
  quiz: UnlockQuiz,
  userAnswer: string | null
): string {
  const correctOption = quiz.options.find(
    (o) => o.label === quiz.correctLabel
  );
  const userOption = userAnswer
    ? quiz.options.find((o) => o.label === userAnswer)
    : null;

  let msg = `【システム生成クイズについての質問】\n\n`;
  msg += `※これはコード理解度確認のためにシステムが自動生成したクイズです。以下のクイズについて詳しく解説してください。\n\n`;
  msg += `【質問】\n${quiz.question}\n\n`;
  msg += `【正解】\n${quiz.correctLabel}) ${correctOption?.text || ""}\n`;
  if (correctOption?.explanation) {
    msg += `解説: ${correctOption.explanation}\n`;
  }

  if (userAnswer && userAnswer !== quiz.correctLabel && userOption) {
    msg += `\n【私の回答】\n${userAnswer}) ${userOption.text}\n`;
    msg += `\nなぜ私の回答が間違いで、正解が正しいのか、より詳しく説明してください。`;
  } else {
    msg += `\nこの正解についてさらに深く理解したいです。関連する概念や応用例も含めて詳しく説明してください。`;
  }

  return msg;
}

// --- Theme color mapping ---

const THEME_COLORS = {
  yellow: {
    border: "border-yellow-500/30",
    bg: "bg-yellow-500/5",
    iconBg: "bg-yellow-500/10",
    iconText: "text-yellow-400",
    buttonBorder: "border-yellow-500/50",
    buttonText: "text-yellow-400",
    buttonHover: "hover:bg-yellow-500/10",
  },
  blue: {
    border: "border-blue-500/30",
    bg: "bg-blue-500/5",
    iconBg: "bg-blue-500/10",
    iconText: "text-blue-400",
    buttonBorder: "border-blue-500/50",
    buttonText: "text-blue-400",
    buttonHover: "hover:bg-blue-500/10",
  },
  purple: {
    border: "border-purple-500/30",
    bg: "bg-purple-500/5",
    iconBg: "bg-purple-500/10",
    iconText: "text-purple-400",
    buttonBorder: "border-purple-500/50",
    buttonText: "text-purple-400",
    buttonHover: "hover:bg-purple-500/10",
  },
} as const;

// --- Props ---

export interface InlineQuizSectionProps {
  messageIndex: number;
  quizHistory: QuizHistoryItem[];
  isUnlocked: boolean;
  unlockedAtMessageIndex: number;
  isLastArtifactMessage: boolean;
  currentQuiz: UnlockQuiz | null;
  hintVisible: boolean;
  activeArtifact: Artifact | null;
  isLoading: boolean;
  onQuizAnswer: (answer: string) => void;
  onSendMessage: (message: string) => void;
  onRegenerateQuiz: () => void;
  themeColor: "yellow" | "blue" | "purple";
  /** Whether to show current quiz (default: true). Set false to skip (e.g., explanation unlock method). */
  showCurrentQuiz?: boolean;
  /** Generation-mode: skip quiz to unlock */
  canSkip?: boolean;
  onSkip?: () => void;
}

/**
 * Shared inline quiz section rendered after each message in the chat loop.
 * Handles: completed quizzes, unlock notification, and current quiz display.
 */
export function InlineQuizSection({
  messageIndex,
  quizHistory,
  isUnlocked,
  unlockedAtMessageIndex,
  isLastArtifactMessage,
  currentQuiz,
  hintVisible,
  activeArtifact,
  isLoading,
  onQuizAnswer,
  onSendMessage,
  onRegenerateQuiz,
  themeColor,
  showCurrentQuiz = true,
  canSkip,
  onSkip,
}: InlineQuizSectionProps) {
  const theme = THEME_COLORS[themeColor];

  // Completed quizzes answered after this message
  const completedQuizzesAfterThis = quizHistory.filter(
    (item) =>
      item.answeredAtMessageCount === messageIndex + 1 &&
      item.isCorrect &&
      item.completedQuiz
  );

  const handleAskForMoreExplanation = useCallback(
    (quiz: UnlockQuiz, userAnswer: string | null) => {
      onSendMessage(buildQuizExplanationMessage(quiz, userAnswer));
    },
    [onSendMessage]
  );

  const handleAskAboutQuestion = useCallback(
    (question: string, opts: string[]) => {
      const optionsList = opts.join("\n");
      onSendMessage(
        `このクイズについて教えてください：\n\n質問: ${question}\n\n選択肢:\n${optionsList}\n\n正解を教えずに、この問題を解くためのヒントや考え方を教えてください。`
      );
    },
    [onSendMessage]
  );

  const shouldShowCurrentQuizHere =
    showCurrentQuiz && isLastArtifactMessage && !isUnlocked;

  return (
    <>
      {/* Completed quizzes inline */}
      {completedQuizzesAfterThis.map((quizItem, quizIndex) => (
        <div
          key={`completed-quiz-${messageIndex}-${quizIndex}`}
          className="px-4 py-4"
        >
          <GenerationQuiz
            quiz={quizItem.completedQuiz!}
            onAnswer={() => {}}
            hintVisible={false}
            completedAnswer={quizItem.userAnswer}
            defaultCollapsed={false}
            isCollapsible={true}
            onAskForMoreExplanation={handleAskForMoreExplanation}
          />
        </div>
      ))}

      {/* Unlock complete notification */}
      {isUnlocked &&
        messageIndex === unlockedAtMessageIndex &&
        quizHistory.length > 0 && (
          <div className="px-4 py-4">
            <div className="rounded-lg border border-green-500/30 bg-gradient-to-r from-green-500/10 to-emerald-500/10 p-4">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-xl bg-green-500/20 flex items-center justify-center">
                  <span className="material-symbols-outlined text-green-400 text-2xl">
                    emoji_events
                  </span>
                </div>
                <div className="flex-1">
                  <p className="font-bold text-lg text-green-400">
                    クイズ完了！
                  </p>
                  <p className="text-sm text-foreground/80">
                    {quizHistory.length}問全て正解しました。コードをコピーできます。
                  </p>
                </div>
                <div className="flex items-center gap-1 text-green-400 bg-green-500/20 px-3 py-1.5 rounded-full">
                  <span className="material-symbols-outlined text-lg">
                    lock_open
                  </span>
                  <span className="text-sm font-medium">アンロック</span>
                </div>
              </div>
            </div>
          </div>
        )}

      {/* Current quiz after artifact message */}
      {shouldShowCurrentQuizHere &&
        (currentQuiz ? (
          <div id="current-quiz-block" className="px-4 py-4">
            <GenerationQuiz
              quiz={currentQuiz}
              onAnswer={onQuizAnswer}
              hintVisible={hintVisible}
              isCollapsible={true}
              onSkip={canSkip ? onSkip : undefined}
              canSkip={canSkip}
              onAskAboutQuestion={handleAskAboutQuestion}
              onAskForMoreExplanation={handleAskForMoreExplanation}
            />
          </div>
        ) : (
          activeArtifact &&
          !isLoading && (
            <div className="px-4 py-4">
              <div className={`rounded-lg border ${theme.border} ${theme.bg} p-4`}>
                <div className="flex items-center gap-3">
                  <div
                    className={`size-10 rounded-lg ${theme.iconBg} flex items-center justify-center`}
                  >
                    <span
                      className={`material-symbols-outlined ${theme.iconText}`}
                    >
                      quiz
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-foreground/90">
                      クイズを読み込んでいます...
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      クイズに回答してコードをアンロックしましょう
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRegenerateQuiz}
                    className={`${theme.buttonBorder} ${theme.buttonText} ${theme.buttonHover}`}
                  >
                    <span className="material-symbols-outlined text-base mr-1.5">
                      refresh
                    </span>
                    クイズを再生成
                  </Button>
                </div>
              </div>
            </div>
          )
        ))}
    </>
  );
}
