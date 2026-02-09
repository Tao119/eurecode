"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

const contactSchema = z.object({
  name: z.string().min(1, "お名前を入力してください").max(100),
  email: z.string().email("有効なメールアドレスを入力してください"),
  subject: z.string().min(1, "件名を入力してください").max(200),
  message: z.string().min(10, "メッセージは10文字以上入力してください").max(5000),
});

type ContactFormData = z.infer<typeof contactSchema>;

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ContactFormData>({
    resolver: zodResolver(contactSchema),
  });

  const onSubmit = async (data: ContactFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "送信に失敗しました");
      }

      setIsSuccess(true);
      reset();
      toast.success("お問い合わせを送信しました");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "送信に失敗しました");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <Card className="w-full max-w-lg text-center">
          <CardContent className="pt-8 pb-8">
            <div className="size-16 mx-auto rounded-full bg-green-500/20 flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl text-green-500">
                check_circle
              </span>
            </div>
            <h2 className="text-xl font-bold mb-2">送信完了</h2>
            <p className="text-muted-foreground mb-6">
              お問い合わせありがとうございます。
              <br />
              内容を確認次第、ご連絡いたします。
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button variant="outline" onClick={() => setIsSuccess(false)}>
                別の問い合わせをする
              </Button>
              <Button asChild>
                <Link href="/">ホームに戻る</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">mail</span>
            お問い合わせ
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            ご質問やご要望がございましたら、以下のフォームからお問い合わせください。
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">お名前 *</Label>
              <Input
                id="name"
                placeholder="山田 太郎"
                {...register("name")}
                disabled={isSubmitting}
              />
              {errors.name && (
                <p className="text-sm text-destructive">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">メールアドレス *</Label>
              <Input
                id="email"
                type="email"
                placeholder="example@email.com"
                {...register("email")}
                disabled={isSubmitting}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">件名 *</Label>
              <Input
                id="subject"
                placeholder="お問い合わせ内容の件名"
                {...register("subject")}
                disabled={isSubmitting}
              />
              {errors.subject && (
                <p className="text-sm text-destructive">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">メッセージ *</Label>
              <Textarea
                id="message"
                placeholder="お問い合わせ内容をご記入ください（10文字以上）"
                rows={6}
                {...register("message")}
                disabled={isSubmitting}
              />
              {errors.message && (
                <p className="text-sm text-destructive">{errors.message.message}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <span className="material-symbols-outlined animate-spin mr-2">
                    progress_activity
                  </span>
                  送信中...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined mr-2">send</span>
                  送信する
                </>
              )}
            </Button>
          </form>

          <div className="mt-6 pt-6 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              お問い合わせの返信には1〜3営業日ほどお時間をいただく場合があります。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
