"use client";

import { SessionProvider as NextAuthSessionProvider } from "next-auth/react";
import { UserSettingsProvider } from "@/contexts/UserSettingsContext";

interface SessionProviderProps {
  children: React.ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
  return (
    <NextAuthSessionProvider
      // セッション情報を5分ごとに自動更新（プラン変更等を反映）
      refetchInterval={5 * 60}
      // ウィンドウにフォーカスが戻った時にセッションを再取得
      refetchOnWindowFocus={true}
      // ネットワーク復帰時にセッションを再取得
      refetchWhenOffline={false}
    >
      <UserSettingsProvider>{children}</UserSettingsProvider>
    </NextAuthSessionProvider>
  );
}
