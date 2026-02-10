"use client";

import { useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Message, BrainstormModeState, ConversationSummary } from "@/types/chat";

interface BrainstormSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  brainstormState: BrainstormModeState;
  conversationId?: string;
}

export function BrainstormSummaryModal({
  open,
  onOpenChange,
  messages,
  brainstormState,
  conversationId,
}: BrainstormSummaryModalProps) {
  const [currentSummary, setCurrentSummary] = useState<string | null>(null);
  const [pastSummaries, setPastSummaries] = useState<ConversationSummary[]>([]);
  const [selectedSummaryId, setSelectedSummaryId] = useState<string>("new");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch past summaries when modal opens
  const fetchPastSummaries = useCallback(async () => {
    if (!conversationId) return;

    try {
      const response = await fetch(`/api/chat/summarize?conversationId=${conversationId}`);
      const data = await response.json();

      if (data.success) {
        setPastSummaries(data.data.summaries);
      }
    } catch (err) {
      console.error("Failed to fetch past summaries:", err);
    }
  }, [conversationId]);

  const generateSummary = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSelectedSummaryId("new");

    try {
      const response = await fetch("/api/chat/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
          brainstormState: {
            subMode: brainstormState.subMode,
            ideaSummary: brainstormState.ideaSummary,
            persona: brainstormState.persona,
            planSteps: brainstormState.planSteps,
          },
          saveSummary: true,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "要約の生成に失敗しました");
      }

      setCurrentSummary(data.data.summary);

      // Refresh past summaries list
      if (conversationId) {
        fetchPastSummaries();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  }, [conversationId, messages, brainstormState, fetchPastSummaries]);

  // Generate summary when modal opens (if not already generated)
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !currentSummary && !isLoading) {
      generateSummary();
      if (conversationId) {
        fetchPastSummaries();
      }
    }
    if (!newOpen) {
      // Reset state when closing
      setSelectedSummaryId("new");
    }
    onOpenChange(newOpen);
  };

  const handleRegenerate = () => {
    setCurrentSummary(null);
    generateSummary();
  };

  const handleCopy = async () => {
    if (currentSummary) {
      await navigator.clipboard.writeText(currentSummary);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSelectSummary = (summaryId: string) => {
    setSelectedSummaryId(summaryId);

    if (summaryId === "new") {
      // Show current/latest generated summary or generate new one
      if (!currentSummary && !isLoading) {
        generateSummary();
      }
    } else {
      // Find and display the selected past summary
      const selected = pastSummaries.find((s) => s.id === summaryId);
      if (selected) {
        setCurrentSummary(selected.content);
      }
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString("ja-JP", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500">summarize</span>
            {isLoading ? "要約中..." : "会話のまとめ"}
          </DialogTitle>
        </DialogHeader>

        {/* Past summaries dropdown */}
        {pastSummaries.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground shrink-0">履歴:</span>
            <Select value={selectedSummaryId} onValueChange={handleSelectSummary}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="まとめを選択" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="new">
                  <span className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">add</span>
                    新しいまとめ
                  </span>
                </SelectItem>
                {pastSummaries.map((summary) => (
                  <SelectItem key={summary.id} value={summary.id}>
                    <span className="flex items-center gap-2">
                      <span className="text-muted-foreground text-xs">
                        {formatDate(summary.createdAt)}
                      </span>
                      <span className="truncate max-w-[200px]">
                        {summary.content.split("\n")[0].replace(/^#+\s*/, "").slice(0, 30)}...
                      </span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 py-4">
          {isLoading && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="size-12 rounded-full bg-purple-500/20 flex items-center justify-center animate-pulse">
                <span className="material-symbols-outlined text-purple-500 text-2xl animate-spin">
                  progress_activity
                </span>
              </div>
              <p className="text-sm text-muted-foreground">
                AIが会話を分析しています...
              </p>
            </div>
          )}

          {error && (
            <div className="flex flex-col items-center justify-center py-12 gap-4">
              <div className="size-12 rounded-full bg-red-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-red-500 text-2xl">
                  error
                </span>
              </div>
              <p className="text-sm text-red-500">{error}</p>
              <Button variant="outline" size="sm" onClick={handleRegenerate}>
                再試行
              </Button>
            </div>
          )}

          {currentSummary && !isLoading && (
            <div className="space-y-4">
              {/* Copyable markdown area */}
              <div className="relative group">
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={handleCopy}
                    className="h-8 px-3 shadow-md"
                  >
                    <span className="material-symbols-outlined text-sm mr-1">
                      {copied ? "check" : "content_copy"}
                    </span>
                    {copied ? "コピー完了" : "コピー"}
                  </Button>
                </div>
                <div className="bg-muted/50 rounded-lg p-4 border border-border">
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        h2: ({ children }) => (
                          <h2 className="text-lg font-semibold mt-4 mb-2 text-foreground border-b border-border pb-1">
                            {children}
                          </h2>
                        ),
                        h3: ({ children }) => (
                          <h3 className="text-base font-medium mt-3 mb-1.5 text-foreground">
                            {children}
                          </h3>
                        ),
                        ul: ({ children }) => (
                          <ul className="list-disc pl-5 my-2 space-y-1">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="list-decimal pl-5 my-2 space-y-1">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-sm text-foreground/90">{children}</li>
                        ),
                        p: ({ children }) => (
                          <p className="text-sm text-foreground/90 my-2">{children}</p>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-foreground">{children}</strong>
                        ),
                      }}
                    >
                      {currentSummary}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {currentSummary && !isLoading && selectedSummaryId === "new" && (
          <div className="flex items-center justify-end pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              className="text-muted-foreground"
            >
              <span className="material-symbols-outlined text-base mr-1">refresh</span>
              再生成
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
