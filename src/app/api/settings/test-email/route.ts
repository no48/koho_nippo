import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/api-auth";
import { sendTestEmail } from "@/lib/email";

// POST /api/settings/test-email - Send a test email
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const body = await request.json();
    const { to } = body;

    if (!to) {
      return NextResponse.json(
        { error: "送信先メールアドレスは必須です" },
        { status: 400 }
      );
    }

    // メールアドレスの簡易バリデーション
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "有効なメールアドレスを入力してください" },
        { status: 400 }
      );
    }

    await sendTestEmail(to);

    return NextResponse.json({
      message: `テストメールを ${to} に送信しました`,
    });
  } catch (error) {
    console.error("Failed to send test email:", error);
    return NextResponse.json(
      { error: "テストメールの送信に失敗しました" },
      { status: 500 }
    );
  }
}
