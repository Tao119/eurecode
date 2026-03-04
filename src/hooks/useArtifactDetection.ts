"use client";

import { useCallback, useEffect, useRef, useMemo } from "react";
import {
  useArtifactQuiz,
  type ArtifactQuizOptions,
  type PersistedArtifactQuizState,
} from "./useArtifactQuiz";
import { parseArtifacts } from "@/lib/artifacts";
import {
  removeIncompleteStreamingTags,
  removeQuizMarkerFromContent,
} from "@/lib/quiz-generator";
import type { Message } from "@/types/chat";

export interface UseArtifactDetectionOptions {
  conversationId?: string;
  messages: Message[];
  isLoading: boolean;
  initialArtifactQuizState?: PersistedArtifactQuizState;
  artQuizOptions?: Partial<ArtifactQuizOptions>;
  /** Label for error logging */
  logPrefix?: string;
}

export interface ActiveArtifactProgress {
  unlockLevel: number;
  totalQuestions: number;
  progressPercentage: number;
  canCopy: boolean;
  isUnlocked: boolean;
  quizHistory: import("./useArtifactQuiz").QuizHistoryItem[];
}

export function useArtifactDetection({
  conversationId,
  messages,
  isLoading,
  initialArtifactQuizState,
  artQuizOptions = {},
  logPrefix = "ArtifactDetection",
}: UseArtifactDetectionOptions) {
  // Core artifact/quiz hook
  const artQuiz = useArtifactQuiz({
    conversationId,
    initialState: initialArtifactQuizState,
    skipAllowed: false,
    hintSpeed: "30sec",
    ...artQuizOptions,
  });

  // Derived state
  const artifactsList = useMemo(
    () => Object.values(artQuiz.state.artifacts),
    [artQuiz.state.artifacts]
  );
  const hasArtifacts = artifactsList.length > 0;

  // Refs for tracking
  const savedArtifactIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);
  const prevMessagesLengthRef = useRef(0);
  const processedContentRef = useRef<string>("");
  const quizGeneratedRef = useRef<Set<string>>(new Set());
  const streamingArtifactRef = useRef<Set<string>>(new Set());

  // Mark initial state artifacts as saved
  useEffect(() => {
    if (initialArtifactQuizState?.artifacts) {
      for (const artifactId of Object.keys(initialArtifactQuizState.artifacts)) {
        savedArtifactIdsRef.current.add(artifactId);
      }
    }
  }, [initialArtifactQuizState]);

  // Per-artifact progress
  const activeArtifactProgress: ActiveArtifactProgress = useMemo(() => {
    const progress = artQuiz.state.activeArtifactId
      ? artQuiz.state.artifactProgress[artQuiz.state.activeArtifactId]
      : null;
    const total = progress?.totalQuestions ?? artQuiz.state.totalQuestions;
    const level = progress?.unlockLevel ?? artQuiz.state.unlockLevel;
    const isUnlocked = total === 0 || level >= total;
    const quizHistory = progress?.quizHistory ?? artQuiz.state.quizHistory ?? [];
    return {
      unlockLevel: level,
      totalQuestions: total,
      progressPercentage: total === 0 ? 100 : (level / total) * 100,
      canCopy: isUnlocked,
      isUnlocked,
      quizHistory,
    };
  }, [
    artQuiz.state.activeArtifactId,
    artQuiz.state.artifactProgress,
    artQuiz.state.totalQuestions,
    artQuiz.state.unlockLevel,
    artQuiz.state.quizHistory,
  ]);

  // Unlock message index (which message triggered unlock)
  const unlockedAtMessageIndex = useMemo(() => {
    if (!activeArtifactProgress.isUnlocked) return -1;
    if (activeArtifactProgress.quizHistory.length === 0) return -1;
    const lastQuiz = activeArtifactProgress.quizHistory.reduce((max, item) => {
      const count = item.answeredAtMessageCount ?? 0;
      return count > (max?.answeredAtMessageCount ?? 0) ? item : max;
    }, activeArtifactProgress.quizHistory[0]);
    return lastQuiz?.answeredAtMessageCount
      ? lastQuiz.answeredAtMessageCount - 1
      : -1;
  }, [activeArtifactProgress.isUnlocked, activeArtifactProgress.quizHistory]);

  // Streaming detection
  const isActiveArtifactStreaming =
    isLoading && (artQuiz.activeArtifact?.id?.endsWith("-truncated") ?? false);

  // --- Artifact detection: initial load ---
  const { addOrUpdateArtifact, generateQuizzesForArtifact, loadQuizzesFromAPI, answerQuizAPI } = artQuiz;

  useEffect(() => {
    if (initializedRef.current || messages.length === 0) return;
    initializedRef.current = true;
    prevMessagesLengthRef.current = messages.length;

    for (const message of messages) {
      if (message.role === "assistant") {
        const { artifacts } = parseArtifacts(message.content);
        for (const artifact of artifacts) {
          addOrUpdateArtifact(artifact);
        }
      }
    }
  }, [messages, addOrUpdateArtifact]);

  // --- Streaming artifact detection ---
  useEffect(() => {
    if (!isLoading || !initializedRef.current || messages.length === 0) {
      if (!isLoading) streamingArtifactRef.current.clear();
      return;
    }
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    const { artifacts } = parseArtifacts(lastMessage.content);
    for (const artifact of artifacts) {
      if (!streamingArtifactRef.current.has(artifact.id)) {
        streamingArtifactRef.current.add(artifact.id);
        addOrUpdateArtifact(artifact);
      }
    }
  }, [isLoading, messages, addOrUpdateArtifact]);

  // --- Post-streaming artifact processing + quiz generation ---
  useEffect(() => {
    if (!initializedRef.current || messages.length === 0) return;
    const lastMessage = messages[messages.length - 1];
    if (lastMessage.role !== "assistant") return;

    const content = lastMessage.content;
    const isNewMessage = messages.length > prevMessagesLengthRef.current;
    const isStreamingComplete =
      !isLoading && processedContentRef.current !== content;

    if (!isNewMessage && !isStreamingComplete) return;

    prevMessagesLengthRef.current = messages.length;
    if (processedContentRef.current === content) return;
    processedContentRef.current = content;

    const { artifacts } = parseArtifacts(content);
    for (const artifact of artifacts) {
      const shouldGenerateQuiz =
        !isLoading && !quizGeneratedRef.current.has(artifact.id);

      if (shouldGenerateQuiz) {
        quizGeneratedRef.current.add(artifact.id);
        addOrUpdateArtifact(artifact).then((savedId) => {
          if (savedId) {
            savedArtifactIdsRef.current.add(savedId);
            generateQuizzesForArtifact(savedId).catch((error) => {
              console.error(`[${logPrefix}] Quiz generation failed:`, error);
            });
          }
        });
      } else {
        addOrUpdateArtifact(artifact).then((savedId) => {
          if (savedId) savedArtifactIdsRef.current.add(savedId);
        });
      }
    }
  }, [messages, isLoading, addOrUpdateArtifact, generateQuizzesForArtifact, logPrefix]);

  // --- Load quizzes when artifact is selected ---
  useEffect(() => {
    const artifactId = artQuiz.state.activeArtifactId;
    if (!artifactId || artQuiz.state.currentQuiz) return;
    if (!savedArtifactIdsRef.current.has(artifactId)) return;

    loadQuizzesFromAPI(artifactId).catch((error) => {
      if ((error as { code?: string })?.code === "NOT_FOUND") return;
      console.error(`[${logPrefix}] Failed to load quizzes:`, error);
    });
  }, [artQuiz.state.activeArtifactId, artQuiz.state.currentQuiz, loadQuizzesFromAPI, logPrefix]);

  // --- Quiz answer handler ---
  const handleQuizAnswer = useCallback(
    async (answer: string) => {
      const quizId = artQuiz.state.currentQuiz?.id;
      const artifactId = artQuiz.state.activeArtifactId;
      if (quizId && artifactId) {
        await answerQuizAPI(artifactId, quizId, answer, messages.length);
      }
    },
    [artQuiz.state.currentQuiz, artQuiz.state.activeArtifactId, answerQuizAPI, messages.length]
  );

  // --- Content processing (strip artifact tags + quiz markers) ---
  const getProcessedContent = useCallback(
    (content: string, streaming: boolean = false) => {
      let processed = content;
      if (streaming) {
        processed = removeIncompleteStreamingTags(processed);
      }
      processed = removeQuizMarkerFromContent(processed);
      const { contentWithoutArtifacts } = parseArtifacts(processed);
      return contentWithoutArtifacts;
    },
    []
  );

  return {
    artQuiz,
    artifactsList,
    hasArtifacts,
    activeArtifactProgress,
    unlockedAtMessageIndex,
    isActiveArtifactStreaming,
    handleQuizAnswer,
    getProcessedContent,
  };
}
