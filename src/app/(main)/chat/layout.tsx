"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { LoadingSpinner } from "@/components/common/LoadingSpinner";
import { ChatWithCredits } from "@/components/chat/ChatWithCredits";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "unauthenticated") {
      const callbackUrl = encodeURIComponent(window.location.pathname);
      router.push(`/login?callbackUrl=${callbackUrl}`);
    }
  }, [status, router]);

  if (status === "loading") {
    return (
      <div className="h-[calc(100dvh-3.5rem)] flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

  // チャット画面は固定レイアウト（ヘッダー56px = 3.5rem下から画面最下部まで）
  // fixed で親のスクロールから独立させ、入力バーを常に画面最下部に固定
  return (
    <div className="fixed inset-0 top-14 flex flex-col overflow-hidden bg-background">
      <ChatWithCredits>
        {children}
      </ChatWithCredits>
    </div>
  );
}
