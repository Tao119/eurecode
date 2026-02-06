"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Admin page error:", error);
  }, [error]);

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      <Card>
        <CardContent className="py-12">
          <div className="text-center space-y-4">
            <div className="size-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-destructive text-3xl">
                admin_panel_settings
              </span>
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold">管理画面の読み込みに失敗しました</h2>
              <p className="text-sm text-muted-foreground">
                データの取得中にエラーが発生しました。再試行してください。
              </p>
            </div>
            {error.digest && (
              <p className="text-xs text-muted-foreground font-mono">
                エラーID: {error.digest}
              </p>
            )}
            <div className="flex gap-3 justify-center pt-2">
              <Button onClick={reset}>
                <span className="material-symbols-outlined text-base mr-1.5">refresh</span>
                再試行
              </Button>
              <Button variant="outline" asChild>
                <a href="/admin">
                  <span className="material-symbols-outlined text-base mr-1.5">dashboard</span>
                  ダッシュボードへ
                </a>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
