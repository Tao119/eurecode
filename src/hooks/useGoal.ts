"use client";

import { useState, useEffect, useCallback } from "react";
import type { LearnerGoal, ConversationMetadata } from "@/types/chat";

interface UseGoalOptions {
  restoredMetadata?: ConversationMetadata | null;
  onMetadataChange?: (metadata: Partial<ConversationMetadata>) => void;
}

interface UseGoalReturn {
  goal: LearnerGoal | null;
  setGoal: (goal: LearnerGoal | null) => void;
  clearGoal: () => void;
}

export function useGoal({
  restoredMetadata,
  onMetadataChange,
}: UseGoalOptions = {}): UseGoalReturn {
  const [goal, setGoalState] = useState<LearnerGoal | null>(null);

  // Restore goal from metadata when conversation is loaded
  useEffect(() => {
    if (restoredMetadata?.learnerGoal) {
      setGoalState(restoredMetadata.learnerGoal);
    }
  }, [restoredMetadata]);

  const setGoal = useCallback(
    (newGoal: LearnerGoal | null) => {
      setGoalState(newGoal);

      // Update metadata for persistence
      if (onMetadataChange) {
        onMetadataChange({ learnerGoal: newGoal ?? undefined });
      }
    },
    [onMetadataChange]
  );

  const clearGoal = useCallback(() => {
    setGoalState(null);
    if (onMetadataChange) {
      onMetadataChange({ learnerGoal: undefined });
    }
  }, [onMetadataChange]);

  return {
    goal,
    setGoal,
    clearGoal,
  };
}
