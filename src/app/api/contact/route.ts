import { NextResponse } from "next/server";
import { z } from "zod";
import { sendContactEmail } from "@/lib/email";

const contactSchema = z.object({
  name: z.string().min(1, "お名前を入力してください").max(100),
  email: z.string().email("有効なメールアドレスを入力してください"),
  subject: z.string().min(1, "件名を入力してください").max(200),
  message: z.string().min(10, "メッセージは10文字以上入力してください").max(5000),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Validate input
    const result = contactSchema.safeParse(body);
    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          error: result.error.issues[0].message,
        },
        { status: 400 }
      );
    }

    const { name, email, subject, message } = result.data;

    // Send email
    await sendContactEmail({ name, email, subject, message });

    return NextResponse.json({
      success: true,
      message: "お問い合わせを送信しました",
    });
  } catch (error) {
    console.error("Contact form error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "送信に失敗しました。しばらくしてから再度お試しください。",
      },
      { status: 500 }
    );
  }
}
