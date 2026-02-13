"use client";

import { cn } from "@/lib/utils";
import type { LearnerGoal } from "@/types/chat";
import { GOAL_TYPES } from "@/types/chat";

interface GoalDisplayProps {
  goal: LearnerGoal | null;
  onEdit?: () => void;
  onClear?: () => void;
  compact?: boolean;
}

export function GoalDisplay({
  goal,
  onEdit,
  onClear,
  compact = false,
}: GoalDisplayProps) {
  if (!goal) {
    if (compact) return null;
    return <GoalEmptyState onEdit={onEdit} />;
  }

  const typeConfig = GOAL_TYPES.find((t) => t.type === goal.type);

  if (compact) {
    return (
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 text-sm">
        <span className="material-symbols-outlined text-primary text-base">
          {typeConfig?.icon || "flag"}
        </span>
        <span className="truncate max-w-[200px]">{goal.description}</span>
        {onEdit && (
          <button
            onClick={onEdit}
            className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="material-symbols-outlined text-base">edit</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="p-4 rounded-xl border border-primary/20 bg-primary/5">
      <div className="flex items-start gap-3">
        <div className="size-10 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
          <span className="material-symbols-outlined text-primary text-xl">
            {typeConfig?.icon || "flag"}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-xs font-medium text-primary">
            {typeConfig?.label || "目標"}
          </span>
          <p className="text-sm font-medium mt-1">{goal.description}</p>
          {goal.successCriteria && (
            <p className="text-xs text-muted-foreground mt-1">
              達成条件: {goal.successCriteria}
            </p>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {onEdit && (
            <button
              onClick={onEdit}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="目標を編集"
            >
              <span className="material-symbols-outlined text-lg">edit</span>
            </button>
          )}
          {onClear && (
            <button
              onClick={onClear}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
              title="目標をクリア"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

interface GoalEmptyStateProps {
  onEdit?: () => void;
}

function GoalEmptyState({ onEdit }: GoalEmptyStateProps) {
  return (
    <div className="p-3 rounded-xl border border-dashed border-border bg-muted/20">
      <div className="flex items-center gap-3">
        <span className="material-symbols-outlined text-muted-foreground text-lg">
          flag
        </span>
        <p className="text-sm text-muted-foreground flex-1">
          目標を設定すると、学習の方向性が明確になります
        </p>
        {onEdit && (
          <button
            onClick={onEdit}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
          >
            設定する
          </button>
        )}
      </div>
    </div>
  );
}

// Trigger button for header
interface GoalTriggerProps {
  goal: LearnerGoal | null;
  onClick: () => void;
}

export function GoalTrigger({ goal, onClick }: GoalTriggerProps) {
  const typeConfig = goal ? GOAL_TYPES.find((t) => t.type === goal.type) : null;

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors",
        goal
          ? "bg-primary/10 text-primary hover:bg-primary/20"
          : "bg-muted text-muted-foreground hover:bg-muted/80"
      )}
    >
      <span className="material-symbols-outlined text-sm">
        {typeConfig?.icon || "flag"}
      </span>
      {goal ? (
        <span className="truncate max-w-[120px]">{goal.description}</span>
      ) : (
        <span>目標を設定</span>
      )}
    </button>
  );
}
