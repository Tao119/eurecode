import Link from "next/link";
import { ModeCard } from "@/components/common/ModeCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Landing page - always visible regardless of auth status (for SEO)
export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 lg:pt-20 lg:pb-32">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-background to-background opacity-50" />
        <div
          className="absolute inset-0 -z-10 opacity-20"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="flex flex-col gap-4 sm:gap-6 text-center md:text-left">
              <h1 className="text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                <span className="block text-primary text-2xl sm:text-3xl font-bold mb-2">
                  Think, Don&apos;t Just Copy
                </span>
                コードを渡すのではなく、
                <br className="hidden sm:block" />
                思考を渡す
              </h1>
              <p className="text-base sm:text-lg text-muted-foreground leading-relaxed max-w-2xl mx-auto md:mx-0">
                AIがあなたの「なぜ？」に答えます。
                <br className="hidden sm:block" />
                単に答えを教えるのではなく、解決への道筋を共に歩む
                <br className="hidden sm:block" />
                全く新しいプログラミング学習プラットフォーム。
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center md:justify-start pt-4">
                <Button size="lg" className="shadow-lg" asChild>
                  <Link href="/register">無料で始める</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/join">
                    <span className="material-symbols-outlined mr-2 text-xl">
                      vpn_key
                    </span>
                    キーで参加
                  </Link>
                </Button>
              </div>
              <div className="pt-4 sm:pt-6 flex flex-wrap items-center justify-center md:justify-start gap-3 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    check_circle
                  </span>
                  クレカ登録不要
                </span>
                <span className="flex items-center gap-1">
                  <span className="material-symbols-outlined text-[18px] text-primary">
                    check_circle
                  </span>
                  14日間無料トライアル
                </span>
              </div>
            </div>

            {/* Hero Visual */}
            <div className="relative mx-auto w-full max-w-[500px] md:max-w-none">
              <Card className="shadow-2xl overflow-hidden border-border/50">
                <div className="flex items-center justify-between border-b border-border bg-card px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-destructive/80" />
                    <div className="h-3 w-3 rounded-full bg-warning/80" />
                    <div className="h-3 w-3 rounded-full bg-success/80" />
                  </div>
                  <div className="text-xs text-muted-foreground font-mono">
                    mentor_session.ts
                  </div>
                  <div className="w-10" />
                </div>
                <CardContent className="p-4 sm:p-6 font-mono text-xs sm:text-sm space-y-4 sm:space-y-6 bg-muted/30 min-h-[200px] sm:min-h-[280px]">
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 size-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold border border-blue-500/30">
                      U
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground">
                        ReactのuseEffectで無限ループが発生してしまいます。
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center font-bold border border-primary/30">
                      <span className="material-symbols-outlined text-[18px]">
                        smart_toy
                      </span>
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">
                        <span className="relative flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
                        </span>
                        思考プロセスを展開中...
                      </div>
                      <p className="text-muted-foreground">
                        答えを出す前に、まず原因を特定しましょう。
                        <code className="bg-muted text-foreground rounded px-1">
                          useEffect
                        </code>
                        の依存配列には何が含まれていますか？
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Section */}
      <section className="py-16 sm:py-20 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">
              The Problem
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              AIにコードを書いてもらうだけでは、<br className="hidden sm:block" />
              本当の力は身につかない
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-6 lg:gap-8">
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6">
                <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl text-destructive">
                    content_copy
                  </span>
                </div>
                <h4 className="font-bold text-foreground mb-2">コピペ依存</h4>
                <p className="text-sm text-muted-foreground">
                  AIが生成したコードをそのまま使うと、なぜそう書くのか理解できないまま
                </p>
              </CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6">
                <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl text-destructive">
                    psychology_alt
                  </span>
                </div>
                <h4 className="font-bold text-foreground mb-2">思考停止</h4>
                <p className="text-sm text-muted-foreground">
                  自分で考える機会が減り、問題解決能力が育たない
                </p>
              </CardContent>
            </Card>
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-6">
                <div className="size-12 rounded-xl bg-destructive/10 flex items-center justify-center mb-4">
                  <span className="material-symbols-outlined text-2xl text-destructive">
                    trending_down
                  </span>
                </div>
                <h4 className="font-bold text-foreground mb-2">成長の停滞</h4>
                <p className="text-sm text-muted-foreground">
                  短期的には楽でも、長期的なスキルアップに繋がらない
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution / Features Section */}
      <section className="py-16 sm:py-20 bg-muted/30" id="features">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mb-16 text-center">
            <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">
              Our Solution
            </h2>
            <h3 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              学習を加速する3つのモード
            </h3>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Eurecodeは単なるコード生成ツールではありません。
              あなたの思考プロセスをサポートし、真の理解へと導きます。
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            <ModeCard mode="explanation" />
            <ModeCard mode="generation" />
            <ModeCard mode="brainstorm" />
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-16 sm:py-20 border-t border-border">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">
              How it Works
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              3ステップで学習を開始
            </h3>
          </div>
          <div className="grid sm:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h4 className="font-bold text-foreground mb-2">モードを選択</h4>
              <p className="text-sm text-muted-foreground">
                解説・生成・壁打ちから、今の学習目的に合ったモードを選びます
              </p>
            </div>
            <div className="text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h4 className="font-bold text-foreground mb-2">質問を投げかける</h4>
              <p className="text-sm text-muted-foreground">
                分からないこと、実装したいことを自由に質問してください
              </p>
            </div>
            <div className="text-center">
              <div className="size-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h4 className="font-bold text-foreground mb-2">思考を深める</h4>
              <p className="text-sm text-muted-foreground">
                AIと対話しながら、自分の力で答えにたどり着きます
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">
              Benefits
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              Eurecodeで得られること
            </h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-blue-400">
                    psychology
                  </span>
                </div>
                <h4 className="font-bold text-foreground mb-2">思考力の向上</h4>
                <p className="text-sm text-muted-foreground">
                  問題を分解し、論理的に考える力が身につく
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-green-400">
                    trending_up
                  </span>
                </div>
                <h4 className="font-bold text-foreground mb-2">持続的な成長</h4>
                <p className="text-sm text-muted-foreground">
                  理解に基づいた学習で、応用力が身につく
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-purple-500/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-purple-400">
                    auto_stories
                  </span>
                </div>
                <h4 className="font-bold text-foreground mb-2">学習の記録</h4>
                <p className="text-sm text-muted-foreground">
                  気づきカードで振り返り、知識を定着
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6 text-center">
                <div className="size-12 rounded-xl bg-orange-500/10 flex items-center justify-center mx-auto mb-4">
                  <span className="material-symbols-outlined text-2xl text-orange-400">
                    groups
                  </span>
                </div>
                <h4 className="font-bold text-foreground mb-2">チーム学習</h4>
                <p className="text-sm text-muted-foreground">
                  組織向けプランでチーム全体の成長を支援
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing CTA Section */}
      <section className="py-16 sm:py-20 border-t border-border">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
            まずは無料で体験
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            14日間の無料トライアルで、Eurecodeの学習体験をお試しください。
            クレジットカード登録不要で、すぐに始められます。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="shadow-lg" asChild>
              <Link href="/register">
                <span className="material-symbols-outlined mr-2">rocket_launch</span>
                無料で始める
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/pricing">
                <span className="material-symbols-outlined mr-2">payments</span>
                料金プランを見る
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 sm:py-20 bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-primary font-bold tracking-wide uppercase text-sm mb-3">
              FAQ
            </h2>
            <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
              よくある質問
            </h3>
          </div>
          <div className="space-y-4">
            <Card>
              <CardContent className="p-6">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">help</span>
                  ChatGPTやCopilotとの違いは？
                </h4>
                <p className="text-sm text-muted-foreground pl-8">
                  一般的なAIツールはコードを「渡す」ことに特化していますが、
                  Eurecodeは「思考プロセスを渡す」ことに特化しています。
                  答えを教えるのではなく、あなた自身が答えにたどり着けるようサポートします。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">help</span>
                  プログラミング初心者でも使える？
                </h4>
                <p className="text-sm text-muted-foreground pl-8">
                  はい、初心者の方にこそおすすめです。
                  解説モードでは基礎的な概念から丁寧に説明し、
                  あなたのペースで理解を深められます。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">help</span>
                  無料トライアル後は自動課金される？
                </h4>
                <p className="text-sm text-muted-foreground pl-8">
                  いいえ、クレジットカードの登録は不要です。
                  無料トライアル終了後も、無料プランとして継続利用できます。
                  有料プランへのアップグレードは任意です。
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-6">
                <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">help</span>
                  組織・チームで利用できる？
                </h4>
                <p className="text-sm text-muted-foreground pl-8">
                  はい、企業・教育機関向けのBusinessプランとEnterpriseプランをご用意しています。
                  アクセスキーによるメンバー管理、利用状況の分析などの機能があります。
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 sm:py-24 bg-gradient-to-b from-primary/10 to-background">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6">
            今日から、<br className="sm:hidden" />
            本当の学習を始めよう
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            コードを渡すのではなく、思考を渡す。
            Eurecodeで、あなたのプログラミング学習を加速させましょう。
          </p>
          <Button size="lg" className="shadow-lg text-lg px-8 py-6" asChild>
            <Link href="/register">
              無料で始める
              <span className="material-symbols-outlined ml-2">arrow_forward</span>
            </Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
