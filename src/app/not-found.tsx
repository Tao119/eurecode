import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-8">
        {/* 404 Illustration */}
        <div className="relative">
          <div className="text-[120px] sm:text-[160px] font-black text-muted-foreground/20 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="size-24 sm:size-32 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="material-symbols-outlined text-primary text-5xl sm:text-6xl">
                search_off
              </span>
            </div>
          </div>
        </div>

        {/* Message */}
        <div className="space-y-2">
          <h1 className="text-2xl sm:text-3xl font-bold">
            ページが見つかりません
          </h1>
          <p className="text-muted-foreground">
            お探しのページは移動または削除された可能性があります。
            <br />
            URLが正しいかご確認ください。
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-xl">home</span>
            ホームに戻る
          </Link>
          <Link
            href="/chat/explanation"
            className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-lg border border-border hover:bg-muted transition-colors"
          >
            <span className="material-symbols-outlined text-xl">chat</span>
            チャットを始める
          </Link>
        </div>

        {/* Help */}
        <p className="text-sm text-muted-foreground">
          問題が続く場合は{" "}
          <Link href="/support" className="text-primary hover:underline">
            サポート
          </Link>
          {" "}にお問い合わせください。
        </p>
      </div>
    </div>
  );
}
