import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET /api/settings - Get all settings
export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const settings = await prisma.setting.findMany();

    // Convert to key-value object
    const settingsObj: Record<string, string> = {};
    settings.forEach((s) => {
      settingsObj[s.key] = s.value;
    });

    return NextResponse.json(settingsObj);
  } catch (error) {
    console.error("Failed to fetch settings:", error);
    return NextResponse.json(
      { error: "設定の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/settings - Update settings
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();

    // Upsert each setting
    const updates = Object.entries(body).map(([key, value]) =>
      prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) },
      })
    );

    await Promise.all(updates);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update settings:", error);
    return NextResponse.json(
      { error: "設定の更新に失敗しました" },
      { status: 500 }
    );
  }
}
