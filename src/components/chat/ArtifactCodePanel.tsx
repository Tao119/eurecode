"use client";

import { useMemo } from "react";
import { BlurredCode } from "./BlurredCode";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Artifact } from "@/types/chat";
import type { ArtifactProgress } from "@/hooks/useArtifactQuiz";
import { cn } from "@/lib/utils";

type ThemeColor = "yellow" | "blue" | "purple";

const THEME_CLASSES: Record<ThemeColor, {
  accent: string;
  accentBg: string;
  accentBorder: string;
  accentHover: string;
  dot: string;
  dotInactive: string;
  headerBg: string;
}> = {
  yellow: {
    accent: "text-yellow-400",
    accentBg: "bg-yellow-500/10",
    accentBorder: "border-yellow-500/50",
    accentHover: "hover:bg-yellow-500/20",
    dot: "bg-yellow-500",
    dotInactive: "bg-zinc-600",
    headerBg: "bg-zinc-900/80",
  },
  blue: {
    accent: "text-blue-400",
    accentBg: "bg-blue-500/10",
    accentBorder: "border-blue-500/50",
    accentHover: "hover:bg-blue-500/20",
    dot: "bg-blue-500",
    dotInactive: "bg-zinc-600",
    headerBg: "bg-zinc-900/80",
  },
  purple: {
    accent: "text-purple-400",
    accentBg: "bg-purple-500/10",
    accentBorder: "border-purple-500/50",
    accentHover: "hover:bg-purple-500/20",
    dot: "bg-purple-500",
    dotInactive: "bg-zinc-600",
    headerBg: "bg-zinc-900/80",
  },
};

interface ArtifactCodePanelProps {
  artifacts: Artifact[];
  activeArtifact: Artifact | null;
  activeArtifactId: string | null;
  artifactProgress: Record<string, ArtifactProgress>;
  unlockLevel: number;
  totalQuestions: number;
  progressPercentage: number;
  canCopy: boolean;
  onSelectArtifact: (id: string) => void;
  onCollapse: () => void;
  onExplainCode?: () => void;
  themeColor?: ThemeColor;
  panelTitle?: string;
  /** ストリーミング中はスケルトン表示 */
  isStreaming?: boolean;
}

export function ArtifactCodePanel({
  artifacts,
  activeArtifact,
  activeArtifactId,
  artifactProgress,
  unlockLevel,
  totalQuestions,
  progressPercentage,
  canCopy,
  onSelectArtifact,
  onCollapse,
  onExplainCode,
  themeColor = "yellow",
  panelTitle = "生成されたコード",
  isStreaming = false,
}: ArtifactCodePanelProps) {
  const theme = THEME_CLASSES[themeColor];

  return (
    <div className="hidden md:flex w-1/2 border-l border-border bg-zinc-950 flex-col min-h-0">
      {/* Header */}
      <div className={cn("shrink-0 flex items-center justify-between px-4 py-3 border-b border-border", theme.headerBg)}>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className={cn("material-symbols-outlined", theme.accent)}>code</span>
            <span className="font-medium">{panelTitle}</span>
          </div>

          {/* Artifact dropdown selector */}
          {artifacts.length > 1 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 transition-colors text-sm ml-4">
                  <span className={cn(theme.accent, "truncate max-w-[150px]")}>
                    {activeArtifact?.title || `${activeArtifact?.language} #${activeArtifact?.version}`}
                  </span>
                  <span className="material-symbols-outlined text-base text-zinc-400">expand_more</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-64 bg-zinc-900 border-zinc-700">
                {artifacts.map((artifact) => {
                  const isActive = activeArtifactId === artifact.id;
                  const progress = artifactProgress[artifact.id];
                  const artUnlockLevel = progress?.unlockLevel ?? 0;
                  const artTotalQ = progress?.totalQuestions ?? totalQuestions;
                  const isArtifactUnlocked = artTotalQ === 0 || artUnlockLevel >= artTotalQ;
                  return (
                    <DropdownMenuItem
                      key={artifact.id}
                      onClick={() => onSelectArtifact(artifact.id)}
                      className={cn(
                        "flex items-center justify-between cursor-pointer",
                        isActive && theme.accentBg
                      )}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={cn(
                          "material-symbols-outlined text-base",
                          isActive ? theme.accent : "text-zinc-500"
                        )}>
                          {isArtifactUnlocked ? "lock_open" : "lock"}
                        </span>
                        <span className={cn(
                          "truncate",
                          isActive ? cn(theme.accent, "font-medium") : "text-zinc-300"
                        )}>
                          {artifact.title || `${artifact.language} #${artifact.version}`}
                        </span>
                      </div>
                      {artTotalQ > 0 && (
                        <div className="flex items-center gap-1 ml-2">
                          {Array.from({ length: artTotalQ }, (_, i) => i + 1).map((level) => (
                            <div
                              key={level}
                              className={cn(
                                "size-1.5 rounded-full",
                                level <= artUnlockLevel ? theme.dot : theme.dotInactive
                              )}
                            />
                          ))}
                        </div>
                      )}
                    </DropdownMenuItem>
                  );
                })}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Unlock progress */}
          <div className="flex items-center gap-2 text-xs">
            {totalQuestions > 0 ? (
              <>
                <span className="text-zinc-500">{unlockLevel}/{totalQuestions} 完了</span>
                <div className="flex gap-0.5">
                  {Array.from({ length: totalQuestions }, (_, i) => i + 1).map((level) => (
                    <div
                      key={level}
                      className={cn(
                        "size-1.5 rounded-full",
                        level <= unlockLevel ? theme.dot : "bg-zinc-700"
                      )}
                    />
                  ))}
                </div>
              </>
            ) : (
              <span className="text-zinc-500">アンロック済み</span>
            )}
          </div>

          {/* Collapse button */}
          <button
            onClick={onCollapse}
            className="p-1 rounded hover:bg-zinc-800 transition-colors"
          >
            <span className="material-symbols-outlined text-base text-zinc-400">close</span>
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {activeArtifact && (
          <BlurredCode
            code={activeArtifact.content}
            language={activeArtifact.language || "text"}
            filename={activeArtifact.title}
            unlockLevel={unlockLevel}
            totalQuestions={totalQuestions}
            progressPercentage={progressPercentage}
            canCopy={canCopy}
            showExplainButton={!!onExplainCode}
            onExplainCode={onExplainCode}
            isStreaming={isStreaming}
          />
        )}
      </div>

      {/* Footer hint */}
      {!canCopy && (
        <div className="shrink-0 px-4 py-3 border-t border-border bg-zinc-900/50">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span className="material-symbols-outlined text-sm">lightbulb</span>
            <span>クイズに答えてコードをアンロックしましょう。重要な部分から段階的に解除されます。</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile bottom sheet version
interface MobileArtifactSheetProps {
  isOpen: boolean;
  onClose: () => void;
  activeArtifact: Artifact | null;
  artifacts: Artifact[];
  activeArtifactId: string | null;
  artifactProgress: Record<string, ArtifactProgress>;
  unlockLevel: number;
  totalQuestions: number;
  progressPercentage: number;
  canCopy: boolean;
  onSelectArtifact: (id: string) => void;
  onExplainCode?: () => void;
  themeColor?: ThemeColor;
  /** ストリーミング中はスケルトン表示 */
  isStreaming?: boolean;
}

export function MobileArtifactSheet({
  isOpen,
  onClose,
  activeArtifact,
  artifacts,
  activeArtifactId,
  artifactProgress,
  unlockLevel,
  totalQuestions,
  progressPercentage,
  canCopy,
  onSelectArtifact,
  onExplainCode,
  themeColor = "yellow",
  isStreaming = false,
}: MobileArtifactSheetProps) {
  const theme = THEME_CLASSES[themeColor];

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="md:hidden fixed inset-0 bg-black/60 z-40"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-50 bg-zinc-950 border-t border-border rounded-t-2xl max-h-[85vh] flex flex-col">
        {/* Handle */}
        <div className="flex justify-center py-2">
          <div className="w-8 h-1 rounded-full bg-zinc-700" />
        </div>

        {/* Header */}
        <div className={cn("flex items-center justify-between px-4 py-2 border-b border-border", theme.headerBg)}>
          <div className="flex items-center gap-2">
            <span className={cn("material-symbols-outlined", theme.accent)}>code</span>
            <span className="font-medium text-sm">
              {activeArtifact?.title || "コード"}
            </span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-zinc-800">
            <span className="material-symbols-outlined text-base text-zinc-400">close</span>
          </button>
        </div>

        {/* Artifact selector (if multiple) */}
        {artifacts.length > 1 && (
          <div className="flex gap-2 px-4 py-2 overflow-x-auto border-b border-border">
            {artifacts.map((artifact) => {
              const isActive = activeArtifactId === artifact.id;
              return (
                <button
                  key={artifact.id}
                  onClick={() => onSelectArtifact(artifact.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs whitespace-nowrap transition-colors",
                    isActive
                      ? cn(theme.accentBg, theme.accent, theme.accentBorder, "border")
                      : "bg-zinc-800 text-zinc-400 border border-transparent hover:bg-zinc-700"
                  )}
                >
                  {artifact.title || `${artifact.language}`}
                </button>
              );
            })}
          </div>
        )}

        {/* Code content */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeArtifact && (
            <BlurredCode
              code={activeArtifact.content}
              language={activeArtifact.language || "text"}
              filename={activeArtifact.title}
              unlockLevel={unlockLevel}
              totalQuestions={totalQuestions}
              progressPercentage={progressPercentage}
              canCopy={canCopy}
              showExplainButton={!!onExplainCode}
              onExplainCode={onExplainCode}
              isStreaming={isStreaming}
            />
          )}
        </div>
      </div>
    </>
  );
}

// Mobile FAB button for showing the code sheet
interface MobileCodeFABProps {
  onClick: () => void;
  progressPercentage: number;
  themeColor?: ThemeColor;
}

export function MobileCodeFAB({ onClick, progressPercentage, themeColor = "yellow" }: MobileCodeFABProps) {
  const bgClass = themeColor === "yellow"
    ? "bg-yellow-500 text-zinc-900"
    : themeColor === "blue"
    ? "bg-blue-500 text-white"
    : "bg-purple-500 text-white";

  const borderClass = themeColor === "yellow"
    ? "border-yellow-500"
    : themeColor === "blue"
    ? "border-blue-500"
    : "border-purple-500";

  const textClass = themeColor === "yellow"
    ? "text-yellow-400"
    : themeColor === "blue"
    ? "text-blue-400"
    : "text-purple-400";

  return (
    <button
      onClick={onClick}
      className={cn(
        "md:hidden fixed bottom-24 right-4 z-30",
        "flex items-center justify-center",
        "size-14 rounded-full shadow-lg",
        bgClass,
        "hover:opacity-90 active:scale-95",
        "transition-all duration-200"
      )}
    >
      <span className="material-symbols-outlined text-2xl">code</span>
      <div className={cn("absolute -top-1 -right-1 size-6 rounded-full bg-zinc-900 border-2 flex items-center justify-center", borderClass)}>
        <span className={cn("text-[10px] font-bold", textClass)}>
          {Math.round(progressPercentage)}%
        </span>
      </div>
    </button>
  );
}
