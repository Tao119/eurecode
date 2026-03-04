"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Artifact, UnlockQuizOption } from "@/types/chat";
import {
  useArtifactQuiz,
  type ArtifactQuizOptions,
  type PersistedArtifactQuizState,
} from "./useArtifactQuiz";

// Re-export types from useArtifactQuiz for backward compatibility
export type {
  UnlockLevel,
  QuizOption,
  UnlockQuiz,
  QuizHistoryItem,
  ArtifactProgress,
} from "./useArtifactQuiz";
export { getBlurLevel, getLevelLabel } from "./useArtifactQuiz";

// Generation-specific types
export type GenerationPhase =
  | "initial"       // 初期状態（要求入力待ち）
  | "planning"      // 計画立案中
  | "coding"        // コード生成完了、クイズ待ち
  | "unlocking"     // アンロッククイズ進行中
  | "unlocked";     // 完全アンロック済み

export interface GeneratedCode {
  language: string;
  code: string;
  filename?: string;
  explanation?: string;
}

export interface Plan {
  steps: string[];
  estimatedTime?: number;
}

// Combined state type (backward compatible)
export interface GenerationModeState {
  phase: GenerationPhase;
  unlockLevel: number;
  totalQuestions: number;
  generatedCode: GeneratedCode | null;
  plan: Plan | null;
  quizHistory: import("./useArtifactQuiz").QuizHistoryItem[];
  currentQuiz: import("./useArtifactQuiz").UnlockQuiz | null;
  hintVisible: boolean;
  hintTimer: number | null;
  artifacts: Record<string, Artifact>;
  activeArtifactId: string | null;
  artifactProgress: Record<string, import("./useArtifactQuiz").ArtifactProgress>;
}

export interface GenerationOptions {
  unlockMethod: "quiz" | "explanation" | "skip";
  hintSpeed: "immediate" | "30sec" | "none";
}

const DEFAULT_OPTIONS: GenerationOptions = {
  unlockMethod: "quiz",
  hintSpeed: "30sec",
};

// Persisted state type (backward compatible)
export interface PersistedGenerationState {
  phase: GenerationPhase;
  unlockLevel: number;
  totalQuestions?: number;
  artifacts: Record<string, Artifact>;
  activeArtifactId: string | null;
  artifactProgress: Record<string, import("./useArtifactQuiz").ArtifactProgress>;
  quizHistory: import("./useArtifactQuiz").QuizHistoryItem[];
}

// Backward compatibility: static labels
export const LEVEL_LABELS: Record<number, { title: string; description: string }> = {
  1: { title: "質問 1", description: "なぜこの実装？" },
  2: { title: "質問 2", description: "なぜこの書き方？" },
  3: { title: "質問 3", description: "なぜこの構造？" },
  4: { title: "完了", description: "コピー可能" },
};

// Generation-specific state
interface GenerationSpecificState {
  phase: GenerationPhase;
  generatedCode: GeneratedCode | null;
  plan: Plan | null;
}

// Save generation state to API (includes phase)
async function saveGenerationPhaseToAPI(
  conversationId: string,
  phase: GenerationPhase,
  artQuizState: PersistedArtifactQuizState
): Promise<void> {
  try {
    const generationState: PersistedGenerationState = {
      phase,
      ...artQuizState,
    };

    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata: { generationState },
      }),
    });
  } catch (e) {
    console.error("Failed to save generation state:", e);
  }
}

export interface UseGenerationModeOptions extends Partial<GenerationOptions> {
  conversationId?: string;
  initialState?: PersistedGenerationState;
  skipAllowed?: boolean;
}

export function useGenerationMode(options: UseGenerationModeOptions = {}) {
  const { conversationId, initialState, skipAllowed = false, ...generationOptions } = options;

  // Prepare initial artifact quiz state from persisted generation state
  const artQuizInitialState: PersistedArtifactQuizState | undefined = initialState
    ? {
        artifacts: initialState.artifacts,
        activeArtifactId: initialState.activeArtifactId,
        artifactProgress: initialState.artifactProgress,
        unlockLevel: initialState.unlockLevel,
        totalQuestions: initialState.totalQuestions,
        quizHistory: initialState.quizHistory,
      }
    : undefined;

  // Use the shared artifact+quiz hook
  const artQuiz = useArtifactQuiz({
    conversationId,
    initialState: artQuizInitialState,
    skipAllowed,
    hintSpeed: generationOptions.hintSpeed || DEFAULT_OPTIONS.hintSpeed,
    disableAutoSave: true, // useGenerationMode manages persistence with phase
  });

  // Generation-specific state
  const [genState, setGenState] = useState<GenerationSpecificState>(() => ({
    phase: initialState?.phase || "initial",
    generatedCode: null,
    plan: null,
  }));

  const [currentOptions, setCurrentOptions] = useState<GenerationOptions>({
    ...DEFAULT_OPTIONS,
    ...generationOptions,
  });

  // Apply initial phase from async-loaded state
  const initialPhaseAppliedRef = useRef(!!initialState);
  useEffect(() => {
    if (!initialState || initialPhaseAppliedRef.current) return;
    initialPhaseAppliedRef.current = true;
    setGenState((prev) => ({
      ...prev,
      phase: initialState.phase || prev.phase,
    }));
  }, [initialState]);

  // Sync generatedCode when activeArtifact changes
  useEffect(() => {
    if (artQuiz.activeArtifact) {
      setGenState((prev) => ({
        ...prev,
        generatedCode: {
          language: artQuiz.activeArtifact!.language || "text",
          code: artQuiz.activeArtifact!.content,
          filename: artQuiz.activeArtifact!.title,
        },
      }));
    }
  }, [artQuiz.activeArtifact]);

  // Sync phase with quiz status changes
  useEffect(() => {
    const status = artQuiz.quizStatus;
    setGenState((prev) => {
      // Only auto-transition if there are artifacts
      if (status === "no-artifacts") return prev;

      // Map quiz status to generation phase
      if (status === "unlocked" && prev.phase !== "unlocked" && prev.phase !== "initial") {
        return { ...prev, phase: "unlocked" };
      }
      if (status === "quizzing" && prev.phase !== "unlocking") {
        return { ...prev, phase: "unlocking" };
      }
      if (status === "has-code" && prev.phase === "initial") {
        return { ...prev, phase: "coding" };
      }
      return prev;
    });
  }, [artQuiz.quizStatus]);

  // Save phase to API when it changes
  const lastSavedPhaseRef = useRef<string>("");
  useEffect(() => {
    if (!conversationId || genState.phase === "initial") return;

    const stateKey = JSON.stringify({
      phase: genState.phase,
      unlockLevel: artQuiz.state.unlockLevel,
      totalQuestions: artQuiz.state.totalQuestions,
      activeArtifactId: artQuiz.state.activeArtifactId,
    });

    if (stateKey === lastSavedPhaseRef.current) return;
    lastSavedPhaseRef.current = stateKey;

    // Note: The artQuiz hook already saves its own state.
    // We save the phase separately via the same endpoint.
    saveGenerationPhaseToAPI(conversationId, genState.phase, {
      artifacts: artQuiz.state.artifacts,
      activeArtifactId: artQuiz.state.activeArtifactId,
      artifactProgress: artQuiz.state.artifactProgress,
      unlockLevel: artQuiz.state.unlockLevel,
      totalQuestions: artQuiz.state.totalQuestions,
      quizHistory: artQuiz.state.quizHistory,
    });
  }, [conversationId, genState.phase, artQuiz.state]);

  // Generation-specific actions
  const setPhase = useCallback((phase: GenerationPhase) => {
    setGenState((prev) => ({ ...prev, phase }));
  }, []);

  const setPlan = useCallback((plan: Plan) => {
    setGenState((prev) => ({ ...prev, plan, phase: "planning" }));
  }, []);

  const setUserEstimate = useCallback((estimate: number) => {
    setGenState((prev) => ({
      ...prev,
      plan: prev.plan ? { ...prev.plan, userEstimate: estimate } : null,
    }));
  }, []);

  const setGeneratedCode = useCallback((code: GeneratedCode) => {
    setGenState((prev) => ({
      ...prev,
      generatedCode: code,
      phase: "coding",
    }));
  }, []);

  // Wrap addOrUpdateArtifact to also update phase
  const addOrUpdateArtifact = useCallback((artifact: Artifact): Promise<string | null> => {
    const result = artQuiz.addOrUpdateArtifact(artifact);

    const isTruncated = artifact.id.endsWith("-truncated");

    // Update phase: move to "coding" when first artifact appears
    setGenState((prev) => {
      if (prev.phase === "initial" || prev.phase === "planning") {
        return {
          ...prev,
          phase: "coding",
          generatedCode: {
            language: artifact.language || "text",
            code: artifact.content,
            filename: artifact.title,
          },
        };
      }
      // Update generatedCode for non-truncated artifacts
      if (!isTruncated) {
        return {
          ...prev,
          generatedCode: {
            language: artifact.language || "text",
            code: artifact.content,
            filename: artifact.title,
          },
        };
      }
      return prev;
    });

    return result;
  }, [artQuiz.addOrUpdateArtifact]);

  // Wrap setActiveArtifact to also update phase and generatedCode
  const setActiveArtifact = useCallback((id: string) => {
    artQuiz.setActiveArtifact(id);

    // Phase will be synced via the quizStatus effect
  }, [artQuiz.setActiveArtifact]);

  // Wrap skipToUnlock to also update phase
  const skipToUnlock = useCallback(() => {
    artQuiz.skipToUnlock();
    setGenState((prev) => ({ ...prev, phase: "unlocked" }));
  }, [artQuiz.skipToUnlock]);

  // Wrap setCurrentQuiz to also update phase
  const setCurrentQuiz = useCallback((quiz: import("./useArtifactQuiz").UnlockQuiz) => {
    artQuiz.setCurrentQuiz(quiz);
    setGenState((prev) => ({
      ...prev,
      phase: "unlocking",
    }));
  }, [artQuiz.setCurrentQuiz]);

  // Wrap answerQuiz to update phase on unlock
  const answerQuiz = useCallback((answer: string, messageCount?: number): boolean => {
    const isCorrect = artQuiz.answerQuiz(answer, messageCount);
    // Phase sync handled by quizStatus effect
    return isCorrect;
  }, [artQuiz.answerQuiz]);

  // Wrap loadQuizzesFromAPI to update phase
  const loadQuizzesFromAPI = useCallback(async (artifactId: string): Promise<void> => {
    await artQuiz.loadQuizzesFromAPI(artifactId);
    // Phase sync handled by quizStatus effect
  }, [artQuiz.loadQuizzesFromAPI]);

  // Wrap generateQuizzesForArtifact to update phase
  const generateQuizzesForArtifact = useCallback(async (artifactId: string): Promise<void> => {
    await artQuiz.generateQuizzesForArtifact(artifactId);
    // Phase sync handled by quizStatus effect
  }, [artQuiz.generateQuizzesForArtifact]);

  // Wrap answerQuizAPI to update phase
  const answerQuizAPI = useCallback(async (
    artifactId: string,
    quizId: string,
    answer: string,
    messageCount?: number
  ): Promise<boolean> => {
    const isCorrect = await artQuiz.answerQuizAPI(artifactId, quizId, answer, messageCount);
    // Phase sync handled by quizStatus effect
    return isCorrect;
  }, [artQuiz.answerQuizAPI]);

  // Wrap updateDialogueProgress to update phase
  const updateDialogueProgress = useCallback((
    artifactId: string,
    newUnlockLevel: number,
    isFullyUnlocked: boolean
  ) => {
    artQuiz.updateDialogueProgress(artifactId, newUnlockLevel, isFullyUnlocked);
    if (isFullyUnlocked) {
      setGenState((prev) => ({ ...prev, phase: "unlocked" }));
    }
  }, [artQuiz.updateDialogueProgress]);

  const updateOptions = useCallback((newOptions: Partial<GenerationOptions>) => {
    setCurrentOptions((prev) => ({ ...prev, ...newOptions }));
  }, []);

  const reset = useCallback(() => {
    artQuiz.resetArtifactQuiz();
    setGenState({
      phase: "initial",
      generatedCode: null,
      plan: null,
    });
  }, [artQuiz.resetArtifactQuiz]);

  // Build combined state (backward compatible GenerationModeState)
  const state: GenerationModeState = {
    phase: genState.phase,
    unlockLevel: artQuiz.state.unlockLevel,
    totalQuestions: artQuiz.state.totalQuestions,
    generatedCode: genState.generatedCode,
    plan: genState.plan,
    quizHistory: artQuiz.state.quizHistory,
    currentQuiz: artQuiz.state.currentQuiz,
    hintVisible: artQuiz.state.hintVisible,
    hintTimer: artQuiz.state.hintTimer,
    artifacts: artQuiz.state.artifacts,
    activeArtifactId: artQuiz.state.activeArtifactId,
    artifactProgress: artQuiz.state.artifactProgress,
  };

  return {
    state,
    options: currentOptions,
    canCopyCode: artQuiz.canCopyCode,
    progressPercentage: artQuiz.progressPercentage,
    activeArtifact: artQuiz.activeArtifact,
    isUnlocked: artQuiz.isUnlocked,
    setPhase,
    setPlan,
    setUserEstimate,
    setGeneratedCode,
    setCurrentQuiz,
    answerQuiz,
    skipToUnlock,
    reset,
    updateOptions,
    addOrUpdateArtifact,
    setActiveArtifact,
    // New Quiz API functions
    loadQuizzesFromAPI,
    generateQuizzesForArtifact,
    answerQuizAPI,
    // Dialogue mode functions
    updateDialogueProgress,
  };
}
