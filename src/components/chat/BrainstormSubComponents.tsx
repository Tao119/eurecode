"use client";

import {
  BRAINSTORM_PHASES,
  PHASE_INFO,
} from "@/hooks/useBrainstormMode";
import { MODE_CONFIG } from "@/config/modes";
import type {
  BrainstormPhase,
  BrainstormSubMode,
  BrainstormModeState,
} from "@/types/chat";
import { BRAINSTORM_SUB_MODES } from "@/types/chat";
import { cn } from "@/lib/utils";

// --- Mobile Phase Menu ---

interface MobilePhaseMenuProps {
  currentPhase: BrainstormPhase;
  completedPhases: BrainstormPhase[];
  onPhaseClick: (phase: BrainstormPhase) => void;
  onPhaseSkip?: (phase: BrainstormPhase) => void;
  onClose: () => void;
}

export function MobilePhaseMenu({
  currentPhase,
  completedPhases,
  onPhaseClick,
  onPhaseSkip,
  onClose,
}: MobilePhaseMenuProps) {
  const currentIndex = BRAINSTORM_PHASES.indexOf(currentPhase);

  return (
    <>
      <div
        className="fixed inset-0 z-[45]"
        onClick={onClose}
        onTouchStart={onClose}
      />
      <div className="relative z-[50] mt-2 p-2 rounded-lg border border-border bg-card shadow-lg">
        <div className="text-xs text-muted-foreground mb-2 px-1">
          タップでフェーズ移動（前進はスキップ）
        </div>
        <div className="grid grid-cols-4 gap-1">
          {BRAINSTORM_PHASES.map((phase, index) => {
            const phaseInfo = PHASE_INFO[phase];
            const isCompleted = completedPhases.includes(phase);
            const isCurrent = phase === currentPhase;
            const isFuture = index > currentIndex;

            const handleClick = () => {
              if (isCurrent) return;
              if (isFuture && onPhaseSkip) {
                onPhaseSkip(phase);
              } else {
                onPhaseClick(phase);
              }
            };

            return (
              <button
                key={phase}
                onClick={handleClick}
                disabled={isCurrent}
                className={cn(
                  "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                  isCurrent
                    ? "bg-purple-500/20 text-purple-400 cursor-default"
                    : isCompleted
                    ? "bg-green-500/10 text-green-400 hover:bg-green-500/20"
                    : isFuture
                    ? "bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 border border-dashed border-orange-500/30"
                    : "bg-muted/30 text-muted-foreground hover:bg-muted/50"
                )}
              >
                <span className="material-symbols-outlined text-lg">
                  {isCompleted && !isCurrent
                    ? "check"
                    : isFuture
                    ? "skip_next"
                    : phaseInfo.icon}
                </span>
                <span className="text-[10px] font-medium truncate w-full text-center">
                  {phaseInfo.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}

// --- Sub Mode Toggle ---

interface SubModeToggleProps {
  currentMode: BrainstormSubMode;
  onModeChange: (mode: BrainstormSubMode) => void;
  disabled: boolean;
}

export function SubModeToggle({
  currentMode,
  onModeChange,
  disabled,
}: SubModeToggleProps) {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg bg-muted/50 border border-border">
      {BRAINSTORM_SUB_MODES.map((mode) => (
        <button
          key={mode.mode}
          onClick={() => onModeChange(mode.mode)}
          disabled={disabled}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-md text-xs font-medium transition-all whitespace-nowrap",
            currentMode === mode.mode
              ? "bg-purple-500/20 text-purple-400 shadow-sm"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
            disabled && "cursor-not-allowed opacity-50"
          )}
          title={mode.description}
        >
          <span className="material-symbols-outlined text-sm">
            {mode.icon}
          </span>
          <span className="hidden sm:inline">{mode.title}</span>
        </button>
      ))}
    </div>
  );
}

// --- Transition Suggestion UI ---

interface TransitionSuggestionUIProps {
  currentPhase: BrainstormPhase;
  targetPhase: BrainstormPhase;
  reason: string | null;
  completionScore: number;
  onAccept: () => void;
  onDismiss: () => void;
}

export function TransitionSuggestionUI({
  currentPhase,
  targetPhase,
  reason,
  completionScore,
  onAccept,
  onDismiss,
}: TransitionSuggestionUIProps) {
  const currentInfo = PHASE_INFO[currentPhase];
  const targetInfo = PHASE_INFO[targetPhase];

  return (
    <div className="animate-in slide-in-from-bottom-2 duration-300 p-4 rounded-xl border border-purple-500/30 bg-gradient-to-r from-purple-500/10 to-pink-500/10">
      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-muted-foreground">
            {currentInfo.title}の進捗
          </span>
          <span className="text-xs font-medium text-purple-400">
            {completionScore}%
          </span>
        </div>
        <div className="h-1.5 bg-muted/30 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full transition-all duration-500"
            style={{ width: `${completionScore}%` }}
          />
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Icon */}
        <div className="flex items-center gap-1 shrink-0">
          <div className="size-8 rounded-full bg-green-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-green-400 text-base">
              check
            </span>
          </div>
          <span className="material-symbols-outlined text-purple-400 text-sm">
            arrow_forward
          </span>
          <div className="size-8 rounded-full bg-purple-500/20 flex items-center justify-center">
            <span className="material-symbols-outlined text-purple-400 text-base">
              {targetInfo.icon}
            </span>
          </div>
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium">
            <span className="text-purple-400">{targetInfo.title}</span>
            <span className="text-foreground">に進めます</span>
          </p>
          {reason && (
            <p className="text-xs text-muted-foreground mt-0.5">
              {reason}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            まだこのステップで話し合いたい場合は、そのまま会話を続けてください
          </p>
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onAccept}
            className="px-4 py-2 text-sm font-medium rounded-lg bg-purple-500 text-white hover:bg-purple-600 transition-colors flex items-center gap-1"
          >
            <span>次へ進む</span>
            <span className="material-symbols-outlined text-base">
              arrow_forward
            </span>
          </button>
          <button
            onClick={onDismiss}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted/50 transition-colors"
            title="このまま続ける"
          >
            <span className="material-symbols-outlined text-base">
              close
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

// --- Brainstorm Completion UI ---

interface BrainstormCompletionUIProps {
  brainstormState: BrainstormModeState;
  onSaveAsProject: () => void;
  onShowSummary: () => void;
  onStartNew: () => void;
}

export function BrainstormCompletionUI({
  brainstormState,
  onSaveAsProject,
  onShowSummary,
  onStartNew,
}: BrainstormCompletionUIProps) {
  const completedAt = brainstormState.completedAt
    ? new Date(brainstormState.completedAt)
    : new Date();

  return (
    <div className="px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <div className="animate-in slide-in-from-bottom-2 duration-300 rounded-2xl border-2 border-green-500/30 bg-gradient-to-br from-green-500/10 via-emerald-500/10 to-teal-500/10 p-6 sm:p-8">
          {/* 完了アイコン */}
          <div className="flex justify-center mb-4">
            <div className="size-16 sm:size-20 rounded-full bg-green-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-green-500 text-4xl sm:text-5xl">
                check_circle
              </span>
            </div>
          </div>

          {/* 完了メッセージ */}
          <h3 className="text-xl sm:text-2xl font-bold text-center mb-2">
            企画書が完成しました
          </h3>
          <p className="text-sm text-muted-foreground text-center mb-6">
            {completedAt.toLocaleString("ja-JP", {
              year: "numeric",
              month: "long",
              day: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>

          {/* サマリー */}
          {brainstormState.ideaSummary && (
            <div className="bg-card/50 rounded-lg p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-green-500 text-sm">
                  lightbulb
                </span>
                <span className="text-sm font-medium">アイデア</span>
              </div>
              <p className="text-sm pl-6">
                {brainstormState.ideaSummary}
              </p>

              {brainstormState.planSteps.length > 0 && (
                <div className="flex items-center gap-2 mt-3 pl-6">
                  <span className="material-symbols-outlined text-green-500 text-xs">
                    checklist
                  </span>
                  <span className="text-xs text-muted-foreground">
                    タスク数: {brainstormState.planSteps.length}件
                  </span>
                </div>
              )}
            </div>
          )}

          {/* アクションボタン */}
          <div className="space-y-3">
            <button
              onClick={onSaveAsProject}
              className="w-full py-3 px-4 rounded-lg bg-green-500 hover:bg-green-600 text-white font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                save
              </span>
              プロジェクトとして保存
            </button>

            <button
              onClick={onShowSummary}
              className="w-full py-3 px-4 rounded-lg border-2 border-border hover:bg-muted/50 font-medium text-sm transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">
                summarize
              </span>
              まとめを見る
            </button>

            <button
              onClick={onStartNew}
              className="w-full py-2.5 px-4 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">
                refresh
              </span>
              新しいブレインストーミングを始める
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Welcome Screen ---

interface BrainstormWelcomeScreenProps {
  welcomeMessage?: string;
  currentPhaseInfo: (typeof PHASE_INFO)[BrainstormPhase];
  onQuickReply: (value: string) => void;
  subMode: BrainstormSubMode;
}

export function BrainstormWelcomeScreen({
  welcomeMessage,
  currentPhaseInfo,
  onQuickReply,
  subMode,
}: BrainstormWelcomeScreenProps) {
  const config = MODE_CONFIG.brainstorm;
  const subModeConfig = BRAINSTORM_SUB_MODES.find(
    (m) => m.mode === subMode
  );

  return (
    <div className="flex flex-col items-center justify-center h-full p-4 sm:p-8">
      <div
        className={cn(
          "rounded-2xl flex items-center justify-center mb-4 sm:mb-6",
          "size-16 sm:size-20",
          config.bgColor,
          config.color
        )}
      >
        <span className="material-symbols-outlined text-3xl sm:text-4xl">
          {subModeConfig?.icon || config.icon}
        </span>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold mb-2">
        {subModeConfig?.title || config.title}
      </h2>

      {welcomeMessage && (
        <p className="text-muted-foreground text-center max-w-md mb-4 text-sm sm:text-base whitespace-pre-line">
          {welcomeMessage}
        </p>
      )}

      {/* フェーズガイド - Planning mode only */}
      {subMode === "planning" && (
        <div className="w-full max-w-md mb-6 sm:mb-8 p-3 sm:p-4 rounded-lg bg-purple-500/10 border border-purple-500/20">
          <div className="flex items-center gap-2 mb-2">
            <span
              className={cn(
                "material-symbols-outlined text-lg sm:text-xl",
                config.color
              )}
            >
              {currentPhaseInfo.icon}
            </span>
            <span
              className={cn(
                "font-medium text-sm sm:text-base",
                config.color
              )}
            >
              {currentPhaseInfo.title}
            </span>
          </div>
          <p className="text-xs sm:text-sm text-foreground/80 mb-2 sm:mb-3">
            {currentPhaseInfo.description}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground italic">
            {currentPhaseInfo.questions[0]}
          </p>
        </div>
      )}

      {/* Quick Replies - Planning mode only */}
      {subMode === "planning" && (
        <div className="w-full max-w-lg px-2">
          <p className="text-xs sm:text-sm text-muted-foreground mb-2 sm:mb-3 text-center">
            選択するか、自由に入力:
          </p>
          <div className="grid grid-cols-2 gap-2">
            {currentPhaseInfo.quickReplies.map((qr, index) => (
              <button
                key={index}
                onClick={() => onQuickReply(qr.value)}
                className={cn(
                  "text-left p-2.5 sm:p-3 rounded-lg border border-border bg-card transition-all text-xs sm:text-sm",
                  config.hoverBgColor,
                  "hover:border-primary/50 active:scale-[0.98]"
                )}
              >
                {qr.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
