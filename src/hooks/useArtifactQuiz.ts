"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Artifact } from "@/types/chat";
import {
  upsertArtifact as apiUpsertArtifact,
  updateArtifactProgress as apiUpdateProgress,
  fetchArtifacts as apiFetchArtifacts,
  apiResponseToArtifact,
  apiResponseToProgress,
  // New Quiz API
  fetchQuizzes as apiFetchQuizzes,
  generateQuizzes as apiGenerateQuizzes,
  answerQuiz as apiAnswerQuiz,
  quizApiToUnlockQuiz,
  type QuizApiResponse,
} from "@/lib/artifactApi";
import { estimateQuizCount } from "@/lib/quiz-generator";
import type { UnlockQuizOption } from "@/types/chat";

// Re-export types that consumers need
export type UnlockLevel = number;
export type QuizOption = UnlockQuizOption;

export interface UnlockQuiz {
  id?: string;
  level: number;
  totalQuestions?: number;
  question: string;
  options: QuizOption[];
  correctLabel: string;
  hint?: string;
  detailedExplanation?: string;
  codeSnippet?: string;
  codeLanguage?: string;
}

export interface QuizHistoryItem {
  level: number;
  question: string;
  userAnswer: string;
  isCorrect: boolean;
  answeredAtMessageCount?: number;
  completedQuiz?: UnlockQuiz;
}

export interface ArtifactProgress {
  unlockLevel: UnlockLevel;
  totalQuestions: number;
  currentQuiz: UnlockQuiz | null;
  quizHistory: QuizHistoryItem[];
}

// Artifact+Quiz state
export interface ArtifactQuizState {
  artifacts: Record<string, Artifact>;
  activeArtifactId: string | null;
  artifactProgress: Record<string, ArtifactProgress>;
  unlockLevel: UnlockLevel;
  totalQuestions: number;
  currentQuiz: UnlockQuiz | null;
  quizHistory: QuizHistoryItem[];
  hintVisible: boolean;
  hintTimer: number | null;
}

// Persisted state subset
export interface PersistedArtifactQuizState {
  artifacts: Record<string, Artifact>;
  activeArtifactId: string | null;
  artifactProgress: Record<string, ArtifactProgress>;
  unlockLevel: UnlockLevel;
  totalQuestions?: number;
  quizHistory: QuizHistoryItem[];
}

// Quiz status for consumers to determine UI phase
export type ArtifactQuizStatus =
  | "no-artifacts"   // No artifacts yet
  | "has-code"       // Has artifacts but no active quiz
  | "quizzing"       // Currently answering a quiz
  | "unlocked";      // Active artifact fully unlocked

// Shared metadata type for extracting generationState from conversation metadata
export interface ExtendedConversationMetadata {
  generationState?: PersistedArtifactQuizState;
}

export interface ArtifactQuizOptions {
  conversationId?: string;
  initialState?: PersistedArtifactQuizState;
  skipAllowed?: boolean;
  hintSpeed?: "immediate" | "30sec" | "none";
  /** When true, skip auto-saving state to API (caller manages persistence) */
  disableAutoSave?: boolean;
}

// Save artifact quiz state to API
async function saveArtifactQuizStateToAPI(
  conversationId: string,
  state: ArtifactQuizState
): Promise<void> {
  try {
    const persistedState: PersistedArtifactQuizState = {
      artifacts: state.artifacts,
      activeArtifactId: state.activeArtifactId,
      artifactProgress: state.artifactProgress,
      unlockLevel: state.unlockLevel,
      totalQuestions: state.totalQuestions,
      quizHistory: state.quizHistory,
    };

    await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        metadata: {
          generationState: persistedState,
        },
      }),
    });
  } catch (e) {
    console.error("Failed to save artifact quiz state:", e);
  }
}

// Dynamic blur level (totalQuestions=0 means immediately unlocked)
export function getBlurLevel(currentLevel: number, totalQuestions: number): string {
  if (totalQuestions === 0 || currentLevel >= totalQuestions) return "blur-none";
  const progress = currentLevel / totalQuestions;
  if (progress >= 0.66) return "blur-[4px]";
  if (progress >= 0.33) return "blur-[8px]";
  return "blur-[12px]";
}

// Dynamic level label
export function getLevelLabel(currentLevel: number, totalQuestions: number): { title: string; description: string } {
  if (totalQuestions === 0 || currentLevel >= totalQuestions) {
    return { title: "完了", description: "コピー可能" };
  }
  return {
    title: `質問 ${currentLevel + 1}/${totalQuestions}`,
    description: `残り${totalQuestions - currentLevel}問`,
  };
}

export function useArtifactQuiz(options: ArtifactQuizOptions = {}) {
  const { conversationId, initialState, skipAllowed = false, hintSpeed = "30sec", disableAutoSave = false } = options;

  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedStateRef = useRef<string>("");
  const initialStateAppliedRef = useRef(false);
  const canSaveRef = useRef(!conversationId);
  const skipAllowedRef = useRef(skipAllowed);
  skipAllowedRef.current = skipAllowed;
  const conversationIdRef = useRef(conversationId);
  conversationIdRef.current = conversationId;
  const artifactsRef = useRef<Record<string, Artifact>>({});
  const hintSpeedRef = useRef(hintSpeed);
  hintSpeedRef.current = hintSpeed;

  const defaultTotalQuestions = skipAllowed ? 0 : 2;

  const [state, setState] = useState<ArtifactQuizState>(() => {
    const defaultState: ArtifactQuizState = {
      artifacts: {},
      activeArtifactId: null,
      artifactProgress: {},
      unlockLevel: 0,
      totalQuestions: defaultTotalQuestions,
      currentQuiz: null,
      quizHistory: [],
      hintVisible: false,
      hintTimer: null,
    };

    if (initialState) {
      initialStateAppliedRef.current = true;
      canSaveRef.current = true;
      return {
        ...defaultState,
        unlockLevel: initialState.unlockLevel ?? 0,
        totalQuestions: skipAllowed ? 0 : (initialState.totalQuestions ?? 2),
        artifacts: initialState.artifacts || {},
        activeArtifactId: initialState.activeArtifactId || null,
        artifactProgress: initialState.artifactProgress || {},
        quizHistory: initialState.quizHistory || [],
      };
    }

    return defaultState;
  });

  // Computed values
  const isUnlocked = state.totalQuestions === 0 || state.unlockLevel >= state.totalQuestions;
  const canCopyCode = isUnlocked;
  const progressPercentage = state.totalQuestions === 0
    ? 100
    : (state.unlockLevel / state.totalQuestions) * 100;

  const activeArtifact = state.activeArtifactId
    ? state.artifacts[state.activeArtifactId]
    : null;

  // Quiz status for consumers
  const quizStatus: ArtifactQuizStatus = (() => {
    if (Object.keys(state.artifacts).length === 0) return "no-artifacts";
    if (isUnlocked) return "unlocked";
    if (state.currentQuiz) return "quizzing";
    return "has-code";
  })();

  // Keep artifactsRef in sync
  useEffect(() => {
    artifactsRef.current = state.artifacts;
  }, [state.artifacts]);

  // Apply async initial state
  useEffect(() => {
    if (!initialState || initialStateAppliedRef.current) return;
    initialStateAppliedRef.current = true;
    canSaveRef.current = true;

    setState((prev) => ({
      ...prev,
      unlockLevel: initialState.unlockLevel ?? prev.unlockLevel,
      totalQuestions: skipAllowed ? 0 : (initialState.totalQuestions ?? prev.totalQuestions),
      artifacts: { ...prev.artifacts, ...initialState.artifacts },
      activeArtifactId: initialState.activeArtifactId || prev.activeArtifactId,
      artifactProgress: { ...prev.artifactProgress, ...initialState.artifactProgress },
      quizHistory: initialState.quizHistory?.length ? initialState.quizHistory : prev.quizHistory,
    }));
  }, [initialState, skipAllowed]);

  // Timeout for initial state loading
  useEffect(() => {
    if (canSaveRef.current) return;
    const timeout = setTimeout(() => {
      if (!canSaveRef.current) {
        canSaveRef.current = true;
      }
    }, 5000);
    return () => clearTimeout(timeout);
  }, []);

  // Save state to API (debounced)
  useEffect(() => {
    if (disableAutoSave) return;
    if (!canSaveRef.current) return;
    if (!conversationId) return;
    // Only save if there are artifacts
    if (Object.keys(state.artifacts).length === 0) return;

    const stateHash = JSON.stringify({
      unlockLevel: state.unlockLevel,
      totalQuestions: state.totalQuestions,
      artifactProgress: state.artifactProgress,
      activeArtifactId: state.activeArtifactId,
    });

    if (stateHash === lastSavedStateRef.current) return;

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(() => {
      lastSavedStateRef.current = stateHash;
      saveArtifactQuizStateToAPI(conversationId, state);
    }, 500);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [conversationId, state]);

  // Set current quiz
  const setCurrentQuiz = useCallback((quiz: UnlockQuiz) => {
    setState((prev) => {
      if (prev.totalQuestions === 0 || prev.unlockLevel >= prev.totalQuestions) {
        return prev;
      }

      const activeId = prev.activeArtifactId;
      const currentProgress = activeId ? prev.artifactProgress[activeId] : null;

      if (currentProgress && currentProgress.unlockLevel >= currentProgress.totalQuestions) {
        return prev;
      }

      const updatedProgress: Record<string, ArtifactProgress> = activeId
        ? {
            ...prev.artifactProgress,
            [activeId]: currentProgress
              ? { ...currentProgress, currentQuiz: quiz }
              : {
                  unlockLevel: prev.unlockLevel,
                  totalQuestions: quiz.totalQuestions ?? prev.totalQuestions,
                  currentQuiz: quiz,
                  quizHistory: [],
                },
          }
        : prev.artifactProgress;

      return {
        ...prev,
        currentQuiz: quiz,
        hintVisible: hintSpeedRef.current === "immediate",
        artifactProgress: updatedProgress,
      };
    });

    if (hintSpeedRef.current === "30sec") {
      const timer = window.setTimeout(() => {
        setState((prev) => ({ ...prev, hintVisible: true }));
      }, 30000);
      setState((prev) => ({ ...prev, hintTimer: timer }));
    }
  }, []);

  // Answer quiz (legacy inline quiz)
  const answerQuiz = useCallback((answer: string, messageCount?: number): boolean => {
    if (!state.currentQuiz) return false;

    const isCorrect = answer === state.currentQuiz.correctLabel;
    const activeId = state.activeArtifactId;

    const newHistoryItem: QuizHistoryItem = {
      level: state.currentQuiz.level,
      question: state.currentQuiz.question,
      userAnswer: answer,
      isCorrect,
      answeredAtMessageCount: messageCount,
      completedQuiz: isCorrect ? { ...state.currentQuiz } : undefined,
    };

    // API sync (non-blocking) - only update on correct answer
    const currentConversationId = conversationIdRef.current;
    if (isCorrect && currentConversationId && activeId) {
      const nextLevel = state.unlockLevel + 1;
      apiUpdateProgress(currentConversationId, activeId, {
        unlockLevel: nextLevel,
        currentQuiz: null,
        quizHistoryItem: newHistoryItem,
      }).catch((e) => {
        console.error("[answerQuiz] API progress sync failed:", e);
      });
    }

    setState((prev) => {
      if (prev.hintTimer) {
        clearTimeout(prev.hintTimer);
      }

      const prevActiveId = prev.activeArtifactId;
      const prevProgress = prevActiveId ? prev.artifactProgress[prevActiveId] : null;
      const newHistory = [...prev.quizHistory, newHistoryItem];

      if (isCorrect) {
        const nextLevel = prev.unlockLevel + 1;
        const totalQ = prev.totalQuestions;

        const updatedProgress: Record<string, ArtifactProgress> = prevActiveId
          ? {
              ...prev.artifactProgress,
              [prevActiveId]: {
                unlockLevel: nextLevel,
                totalQuestions: prevProgress?.totalQuestions || totalQ,
                currentQuiz: null,
                quizHistory: prevProgress
                  ? [...prevProgress.quizHistory, newHistoryItem]
                  : [newHistoryItem],
              },
            }
          : prev.artifactProgress;

        return {
          ...prev,
          quizHistory: newHistory,
          unlockLevel: nextLevel,
          currentQuiz: null,
          hintVisible: false,
          hintTimer: null,
          artifactProgress: updatedProgress,
        };
      }

      return {
        ...prev,
        quizHistory: newHistory,
        hintVisible: true,
        hintTimer: null,
      };
    });

    return isCorrect;
  }, [state.currentQuiz, state.activeArtifactId, state.artifactProgress, state.unlockLevel]);

  // Skip to unlock
  const skipToUnlock = useCallback(() => {
    const activeId = state.activeArtifactId;
    const currentProgress = activeId ? state.artifactProgress[activeId] : null;

    const currentConversationId = conversationIdRef.current;
    if (currentConversationId && activeId && currentProgress) {
      apiUpdateProgress(currentConversationId, activeId, {
        unlockLevel: currentProgress.totalQuestions,
        currentQuiz: null,
      }).catch((e) => {
        console.error("[skipToUnlock] API progress sync failed:", e);
      });
    }

    setState((prev) => {
      const prevActiveId = prev.activeArtifactId;
      const prevProgress = prevActiveId ? prev.artifactProgress[prevActiveId] : null;

      const updatedProgress: Record<string, ArtifactProgress> = prevActiveId && prevProgress
        ? {
            ...prev.artifactProgress,
            [prevActiveId]: {
              ...prevProgress,
              unlockLevel: prevProgress.totalQuestions,
              currentQuiz: null,
            },
          }
        : prev.artifactProgress;

      return {
        ...prev,
        unlockLevel: prev.totalQuestions,
        currentQuiz: null,
        hintVisible: false,
        artifactProgress: updatedProgress,
      };
    });
  }, [state.activeArtifactId, state.artifactProgress]);

  // Load quizzes from API
  const loadQuizzesFromAPI = useCallback(async (artifactId: string): Promise<void> => {
    try {
      const response = await apiFetchQuizzes(artifactId);

      const nextPendingQuiz = response.items.find((q) => q.status === "pending");

      const quizHistory: QuizHistoryItem[] = response.items
        .filter((q) => q.status === "answered")
        .map((q) => ({
          level: q.level - 1,
          question: q.question,
          userAnswer: q.userAnswer || "",
          isCorrect: q.isCorrect || false,
          completedQuiz: q.isCorrect ? quizApiToUnlockQuiz(q) : undefined,
        }));

      setState((prev) => {
        const artifact = prev.artifacts[artifactId];
        if (!artifact) return prev;

        const newProgress: ArtifactProgress = {
          unlockLevel: response.currentLevel - 1,
          totalQuestions: response.total,
          currentQuiz: nextPendingQuiz ? quizApiToUnlockQuiz(nextPendingQuiz) : null,
          quizHistory,
        };

        return {
          ...prev,
          unlockLevel: newProgress.unlockLevel,
          totalQuestions: response.total,
          currentQuiz: nextPendingQuiz ? quizApiToUnlockQuiz(nextPendingQuiz) : null,
          quizHistory,
          artifactProgress: {
            ...prev.artifactProgress,
            [artifactId]: newProgress,
          },
        };
      });
    } catch (error) {
      console.error("[loadQuizzesFromAPI] Failed to load quizzes:", error);
    }
  }, []);

  // Generate quizzes for artifact
  const generateQuizzesForArtifact = useCallback(async (artifactId: string): Promise<void> => {
    try {
      const response = await apiGenerateQuizzes(artifactId);
      const firstQuiz = response.items.find((q) => q.status === "pending");

      setState((prev) => {
        const artifact = prev.artifacts[artifactId];
        if (!artifact) return prev;

        const newProgress: ArtifactProgress = {
          unlockLevel: 0,
          totalQuestions: response.total,
          currentQuiz: firstQuiz ? quizApiToUnlockQuiz(firstQuiz) : null,
          quizHistory: [],
        };

        return {
          ...prev,
          unlockLevel: 0,
          totalQuestions: response.total,
          currentQuiz: firstQuiz ? quizApiToUnlockQuiz(firstQuiz) : null,
          quizHistory: [],
          artifactProgress: {
            ...prev.artifactProgress,
            [artifactId]: newProgress,
          },
        };
      });
    } catch (error) {
      console.error("[generateQuizzesForArtifact] Failed to generate quizzes:", error);
    }
  }, []);

  // Answer quiz via API
  const answerQuizAPI = useCallback(async (
    artifactId: string,
    quizId: string,
    answer: string,
    messageCount?: number
  ): Promise<boolean> => {
    try {
      const response = await apiAnswerQuiz(artifactId, quizId, answer);

      const newHistoryItem: QuizHistoryItem = {
        level: response.quiz.level - 1,
        question: response.quiz.question,
        userAnswer: answer,
        isCorrect: response.isCorrect,
        answeredAtMessageCount: messageCount,
        completedQuiz: response.isCorrect ? quizApiToUnlockQuiz(response.quiz) : undefined,
      };

      setState((prev) => {
        if (prev.hintTimer) {
          clearTimeout(prev.hintTimer);
        }

        const newHistory = [...prev.quizHistory, newHistoryItem];

        const newProgress: ArtifactProgress = {
          unlockLevel: response.currentLevel - 1,
          totalQuestions: response.totalQuestions,
          currentQuiz: response.nextQuiz ? quizApiToUnlockQuiz(response.nextQuiz) : null,
          quizHistory: newHistory,
        };

        return {
          ...prev,
          quizHistory: newHistory,
          unlockLevel: newProgress.unlockLevel,
          totalQuestions: response.totalQuestions,
          currentQuiz: response.nextQuiz ? quizApiToUnlockQuiz(response.nextQuiz) : null,
          hintVisible: !response.isCorrect,
          hintTimer: null,
          artifactProgress: {
            ...prev.artifactProgress,
            [artifactId]: newProgress,
          },
        };
      });

      return response.isCorrect;
    } catch (error) {
      console.error("[answerQuizAPI] Failed to answer quiz:", error);
      return false;
    }
  }, []);

  // Add or update artifact
  const addOrUpdateArtifact = useCallback((artifact: Artifact): Promise<string | null> => {
    const isTruncated = artifact.id.endsWith("-truncated");

    const currentArtifacts = artifactsRef.current;
    let effectiveId = artifact.id;
    let existingArtifactByTitle: Artifact | null = null;

    if (!isTruncated) {
      for (const [id, existingArtifact] of Object.entries(currentArtifacts)) {
        if (
          existingArtifact.title === artifact.title &&
          !id.endsWith("-truncated") &&
          id !== artifact.id
        ) {
          existingArtifactByTitle = existingArtifact;
          effectiveId = id;
          break;
        }
      }
    }

    const estimatedQuizCount = skipAllowedRef.current ? 0 : estimateQuizCount(artifact.content);
    const currentConversationId = conversationIdRef.current;

    const apiPromise: Promise<string | null> = (currentConversationId && !isTruncated)
      ? apiUpsertArtifact(currentConversationId, {
          id: effectiveId,
          type: artifact.type,
          title: artifact.title,
          content: artifact.content,
          language: artifact.language,
          totalQuestions: estimatedQuizCount,
        })
          .then((response) => response.id)
          .catch((e) => {
            console.error("[addOrUpdateArtifact] API sync failed:", {
              error: e,
              artifactId: effectiveId,
              conversationId: currentConversationId,
            });
            return null;
          })
      : Promise.resolve(null);

    setState((prev) => {
      const existing = prev.artifacts[effectiveId] || prev.artifacts[artifact.id];
      const existingProgress = prev.artifactProgress[effectiveId] || prev.artifactProgress[artifact.id];

      const updatedArtifact: Artifact = existing
        ? {
            ...artifact,
            id: effectiveId,
            version: existing.version + 1,
            updatedAt: new Date().toISOString(),
            createdAt: existing.createdAt,
          }
        : { ...artifact, id: effectiveId };

      // Truncated artifacts: add for display but don't set as active
      if (isTruncated) {
        return {
          ...prev,
          artifacts: {
            ...prev.artifacts,
            [artifact.id]: updatedArtifact,
          },
        };
      }

      // Clean up truncated versions
      const truncatedId = `${effectiveId}-truncated`;
      const originalTruncatedId = `${artifact.id}-truncated`;
      const newArtifacts = { ...prev.artifacts };
      if (newArtifacts[truncatedId]) delete newArtifacts[truncatedId];
      if (originalTruncatedId !== truncatedId && newArtifacts[originalTruncatedId]) {
        delete newArtifacts[originalTruncatedId];
      }
      newArtifacts[effectiveId] = updatedArtifact;

      const newProgress = { ...prev.artifactProgress };
      if (newProgress[truncatedId]) delete newProgress[truncatedId];
      if (originalTruncatedId !== truncatedId && newProgress[originalTruncatedId]) {
        delete newProgress[originalTruncatedId];
      }

      // Preserve existing progress
      if (existingProgress) {
        const effectiveTotalQuestions = skipAllowedRef.current ? 0 : existingProgress.totalQuestions;
        const effectiveUnlockLevel = skipAllowedRef.current ? 0 : existingProgress.unlockLevel;
        const artifactIsUnlocked = effectiveTotalQuestions === 0 ||
          effectiveUnlockLevel >= effectiveTotalQuestions;

        return {
          ...prev,
          artifacts: newArtifacts,
          activeArtifactId: effectiveId,
          unlockLevel: effectiveUnlockLevel,
          totalQuestions: effectiveTotalQuestions,
          currentQuiz: artifactIsUnlocked ? null : existingProgress.currentQuiz,
          quizHistory: existingProgress.quizHistory,
          artifactProgress: newProgress,
        };
      }

      // Wait for initial state if not yet loaded
      if (!canSaveRef.current && conversationIdRef.current) {
        return {
          ...prev,
          artifacts: newArtifacts,
          activeArtifactId: effectiveId,
          artifactProgress: newProgress,
        };
      }

      // New artifact: create progress
      const artifactProgress: ArtifactProgress = {
        unlockLevel: 0,
        totalQuestions: estimatedQuizCount,
        currentQuiz: null,
        quizHistory: [],
      };
      newProgress[effectiveId] = artifactProgress;

      // Don't switch active if there's already a non-truncated active artifact
      const currentActiveId = prev.activeArtifactId;
      const hasExistingActiveArtifact = currentActiveId &&
        prev.artifacts[currentActiveId] &&
        !currentActiveId.endsWith("-truncated");

      if (hasExistingActiveArtifact) {
        return {
          ...prev,
          artifacts: newArtifacts,
          artifactProgress: newProgress,
        };
      }

      // First artifact or replacing truncated: set as active
      return {
        ...prev,
        artifacts: newArtifacts,
        activeArtifactId: effectiveId,
        unlockLevel: 0,
        totalQuestions: estimatedQuizCount,
        currentQuiz: null,
        quizHistory: [],
        artifactProgress: newProgress,
      };
    });

    return apiPromise;
  }, []);

  // Set active artifact
  const setActiveArtifact = useCallback((id: string) => {
    setState((prev) => {
      const artifact = prev.artifacts[id];
      if (!artifact) return prev;

      const progress = prev.artifactProgress[id];

      if (progress) {
        const effectiveTotalQuestions = skipAllowedRef.current ? 0 : progress.totalQuestions;
        const effectiveUnlockLevel = skipAllowedRef.current ? 0 : progress.unlockLevel;
        const artifactIsUnlocked = effectiveTotalQuestions === 0 ||
          effectiveUnlockLevel >= effectiveTotalQuestions;

        return {
          ...prev,
          activeArtifactId: id,
          unlockLevel: effectiveUnlockLevel,
          totalQuestions: effectiveTotalQuestions,
          currentQuiz: artifactIsUnlocked ? null : progress.currentQuiz,
          quizHistory: progress.quizHistory,
        };
      }

      const effectiveTotalQuestions = skipAllowedRef.current ? 0 : prev.totalQuestions;
      return {
        ...prev,
        activeArtifactId: id,
        unlockLevel: 0,
        totalQuestions: effectiveTotalQuestions,
        currentQuiz: null,
        quizHistory: [],
      };
    });
  }, []);

  // Dialogue mode: update progress
  const updateDialogueProgress = useCallback((
    artifactId: string,
    newUnlockLevel: number,
    isFullyUnlocked: boolean
  ) => {
    setState((prev) => {
      const currentProgress = prev.artifactProgress[artifactId];
      if (!currentProgress) return prev;

      const updatedProgress: ArtifactProgress = {
        ...currentProgress,
        unlockLevel: newUnlockLevel,
      };

      return {
        ...prev,
        unlockLevel: newUnlockLevel,
        artifactProgress: {
          ...prev.artifactProgress,
          [artifactId]: updatedProgress,
        },
      };
    });
  }, []);

  // Reset all state
  const resetArtifactQuiz = useCallback(() => {
    setState({
      artifacts: {},
      activeArtifactId: null,
      artifactProgress: {},
      unlockLevel: 0,
      totalQuestions: defaultTotalQuestions,
      currentQuiz: null,
      quizHistory: [],
      hintVisible: false,
      hintTimer: null,
    });
  }, [defaultTotalQuestions]);

  return {
    state,
    // Computed values
    isUnlocked,
    canCopyCode,
    progressPercentage,
    activeArtifact,
    quizStatus,
    // Actions
    setCurrentQuiz,
    answerQuiz,
    skipToUnlock,
    addOrUpdateArtifact,
    setActiveArtifact,
    resetArtifactQuiz,
    // Quiz API
    loadQuizzesFromAPI,
    generateQuizzesForArtifact,
    answerQuizAPI,
    // Dialogue
    updateDialogueProgress,
  };
}
