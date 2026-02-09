import Link from "next/link";
import { FeatureCard } from "@/components/landing/FeatureCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function LandingPage() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-28 lg:pt-32 lg:pb-40">
        {/* Gradient background */}
        <div className="absolute inset-0 -z-10">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/8 via-background to-background" />
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute top-20 right-1/4 w-80 h-80 bg-violet-500/15 rounded-full blur-3xl" />
        </div>

        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            {/* Main Headline */}
            <h1 className="text-5xl sm:text-6xl lg:text-8xl font-black tracking-tighter text-foreground">
              Think.
            </h1>
            <p className="mt-4 text-xl sm:text-2xl text-muted-foreground font-medium">
              答えをもらう前に、考えよう。
            </p>

            {/* Subheadline */}
            <p className="mt-8 text-base sm:text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
              AIがコードを書く時代。だからこそ、
              <br className="hidden sm:block" />
              「なぜそう書くのか」を理解できる人が求められている。
            </p>

            {/* CTA */}
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-base px-8 h-12 shadow-lg shadow-primary/20" asChild>
                <Link href="/register">無料で始める</Link>
              </Button>
              <Button size="lg" variant="outline" className="text-base px-8 h-12" asChild>
                <Link href="/pricing">料金プランを見る</Link>
              </Button>
            </div>

            {/* Trust indicators */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
                クレカ登録不要
              </span>
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-lg text-primary">check_circle</span>
                14日間無料
              </span>
            </div>
          </div>

          {/* Product Visual */}
          <div className="mt-20">
            <Card className="shadow-2xl border-border/30 overflow-hidden">
              <div className="flex items-center justify-between border-b border-border bg-muted/50 px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-400/80" />
                  <div className="h-3 w-3 rounded-full bg-yellow-400/80" />
                  <div className="h-3 w-3 rounded-full bg-green-400/80" />
                </div>
                <div className="text-xs text-muted-foreground font-mono">Eurecode</div>
                <div className="w-10" />
              </div>
              <CardContent className="p-6 sm:p-8 bg-card/50 backdrop-blur">
                <div className="space-y-6">
                  {/* User message */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 size-10 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm border border-blue-500/30">
                      You
                    </div>
                    <div className="flex-1 pt-2">
                      <p className="text-foreground">
                        useEffectで無限ループが起きてるんですが、なぜですか？
                      </p>
                    </div>
                  </div>

                  {/* AI response */}
                  <div className="flex gap-4">
                    <div className="flex-shrink-0 size-10 rounded-full bg-primary/20 text-primary flex items-center justify-center border border-primary/30">
                      <span className="material-symbols-outlined text-lg">psychology</span>
                    </div>
                    <div className="flex-1 pt-2 space-y-3">
                      <p className="text-foreground font-medium">
                        一緒に原因を探ってみましょう。
                      </p>
                      <p className="text-muted-foreground">
                        依存配列には何を入れていますか？
                        <br />
                        空配列がないと、毎回effectが走ります。
                      </p>
                      <div className="inline-flex items-center gap-2 text-xs text-primary bg-primary/10 px-3 py-1.5 rounded-full">
                        <span className="material-symbols-outlined text-sm">lightbulb</span>
                        依存配列の値が毎回新しく生成されていませんか？
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* What's different */}
      <section className="py-20 sm:py-28 border-t border-border/50">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-2xl sm:text-3xl font-bold text-foreground">
              ChatGPTは答えをくれる。
              <br />
              Eurecodeは考え方を教える。
            </h2>
            <p className="mt-6 text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              コードを渡すのではなく、問いを投げかける。
              <br />
              あなたが自分で答えにたどり着けるように。
            </p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 sm:py-28 bg-muted/30" id="features">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              3つのモード
            </h2>
            <p className="mt-4 text-muted-foreground max-w-2xl mx-auto">
              目的に合わせて使い分けられます。
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard mode="explanation" />
            <FeatureCard mode="generation" />
            <FeatureCard mode="brainstorm" />
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground text-center mb-12">
            よくある質問
          </h2>

          <div className="space-y-6">
            <div className="border-b border-border pb-6">
              <h3 className="font-medium text-foreground mb-2">
                ChatGPTやCopilotとの違いは？
              </h3>
              <p className="text-muted-foreground text-sm">
                一般的なAIは「答え」を渡します。Eurecodeは「考え方」を渡します。
                あなたが自分で答えにたどり着けるよう、質問を投げかけ、ヒントを与えます。
              </p>
            </div>

            <div className="border-b border-border pb-6">
              <h3 className="font-medium text-foreground mb-2">
                プログラミング初心者でも使えますか？
              </h3>
              <p className="text-muted-foreground text-sm">
                はい。むしろ初心者にこそおすすめです。
                コピペの癖がつく前に、正しい学習習慣を身につけられます。
              </p>
            </div>

            <div className="border-b border-border pb-6">
              <h3 className="font-medium text-foreground mb-2">
                無料トライアル後は自動課金されますか？
              </h3>
              <p className="text-muted-foreground text-sm">
                いいえ。クレジットカードの登録は不要です。
                無料期間終了後も、機能制限付きの無料プランで継続利用できます。
              </p>
            </div>

            <div className="pb-6">
              <h3 className="font-medium text-foreground mb-2">
                チームや企業で導入できますか？
              </h3>
              <p className="text-muted-foreground text-sm">
                はい。Businessプラン・Enterpriseプランでは、
                メンバー管理や利用状況の分析機能を提供しています。
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 sm:py-32 relative overflow-hidden bg-muted/30">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
            Think first.
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            14日間、無料で試せます。
          </p>
          <div className="mt-10">
            <Button size="lg" className="text-base px-10 h-14 shadow-lg shadow-primary/20" asChild>
              <Link href="/register">
                始める
                <span className="material-symbols-outlined ml-2">arrow_forward</span>
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
