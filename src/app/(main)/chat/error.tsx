"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    console.error("Chat error:", error);
  }, [error]);

  return (
    <div className="h-full flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="size-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
          <span className="material-symbols-outlined text-destructive text-3xl">
            chat_error
          </span>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold">チャットの読み込みに失敗しました</h2>
          <p className="text-sm text-muted-foreground">
            会話データの取得中にエラーが発生しました。
          </p>
        </div>
        {error.digest && (
          <p className="text-xs text-muted-foreground font-mono">
            ID: {error.digest}
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={reset} size="sm">
            <span className="material-symbols-outlined text-base mr-1.5">refresh</span>
            再試行
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/chat/explanation")}
          >
            <span className="material-symbols-outlined text-base mr-1.5">add</span>
            新しい会話
          </Button>
        </div>
      </div>
    </div>
  );
}
