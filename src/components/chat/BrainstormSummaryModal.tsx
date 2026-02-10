"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Message, BrainstormModeState } from "@/types/chat";

interface BrainstormSummaryModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  messages: Message[];
  brainstormState: BrainstormModeState;
}

export function BrainstormSummaryModal({
  open,
  onOpenChange,
  messages,
  brainstormState,
}: BrainstormSummaryModalProps) {
  const [summary, setSummary] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateSummary = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/chat/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
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
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error?.message || "要約の生成に失敗しました");
      }

      setSummary(data.data.summary);
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setIsLoading(false);
    }
  };

  // Generate summary when modal opens (if not already generated)
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen && !summary && !isLoading) {
      generateSummary();
    }
    onOpenChange(newOpen);
  };

  const handleRegenerate = () => {
    setSummary(null);
    generateSummary();
  };

  const handleCopy = async () => {
    if (summary) {
      await navigator.clipboard.writeText(summary);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-500">summarize</span>
            会話のまとめ
          </DialogTitle>
          <DialogDescription>
            {brainstormState.subMode === "planning"
              ? "壁打ちの内容を企画書形式で要約しました"
              : "壁打ちの内容を要約しました"}
          </DialogDescription>
        </DialogHeader>

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

          {summary && !isLoading && (
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
                {summary}
              </ReactMarkdown>
            </div>
          )}
        </div>

        {summary && !isLoading && (
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRegenerate}
              className="text-muted-foreground"
            >
              <span className="material-symbols-outlined text-base mr-1">refresh</span>
              再生成
            </Button>
            <Button variant="outline" size="sm" onClick={handleCopy}>
              <span className="material-symbols-outlined text-base mr-1">content_copy</span>
              コピー
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
