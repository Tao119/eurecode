"use client";

import type { ConversationBranch } from "@/types/chat";
import { cn } from "@/lib/utils";

interface BranchSelectorProps {
  branches: ConversationBranch[];
  currentBranchId?: string;
  onSelect: (branchId: string) => void;
  onClose: () => void;
}

export function SharedBranchSelector({
  branches,
  currentBranchId,
  onSelect,
  onClose,
}: BranchSelectorProps) {
  return (
    <>
      {/* Backdrop overlay */}
      <div
        className="fixed inset-0 z-40 bg-black/20"
        onClick={onClose}
      />
      {/* Dropdown menu */}
      <div
        className="absolute right-0 top-full mt-1 z-50 w-72 rounded-lg border-2 border-orange-500/30 bg-card shadow-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b border-orange-500/20 bg-orange-500/10">
          <div className="flex items-center gap-2 text-sm font-semibold text-orange-100">
            <span className="material-symbols-outlined text-base text-orange-400">
              fork_right
            </span>
            <span>会話の分岐</span>
          </div>
        </div>
        <div className="max-h-64 overflow-y-auto bg-card">
          {branches.map((branch) => {
            const isActive = branch.id === currentBranchId;
            const isMain = !branch.parentBranchId;
            return (
              <button
                key={branch.id}
                onClick={() => onSelect(branch.id)}
                className={cn(
                  "w-full text-left px-4 py-3 flex items-center gap-3 transition-colors border-b border-border/50 last:border-b-0",
                  isActive
                    ? "bg-orange-500/20 text-orange-100"
                    : "hover:bg-muted text-foreground"
                )}
              >
                <span
                  className={cn(
                    "material-symbols-outlined text-xl",
                    isMain ? "text-blue-400" : "text-orange-400"
                  )}
                >
                  {isMain ? "timeline" : "fork_right"}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm truncate">
                    {branch.name}
                  </div>
                  <div className="text-xs text-foreground/60">
                    {isMain
                      ? "オリジナル"
                      : `メッセージ ${branch.forkPointIndex + 1} から分岐`}
                  </div>
                </div>
                {isActive && (
                  <span className="material-symbols-outlined text-orange-400 text-lg">
                    check
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
}
