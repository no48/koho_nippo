import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET /api/checklist - Get all checklist items
export async function GET() {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const items = await prisma.checklistItem.findMany({
      orderBy: [
        { isCompleted: "asc" },
        { priority: "desc" },
        { dueDate: "asc" },
        { createdAt: "desc" },
      ],
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Failed to fetch checklist items:", error);
    return NextResponse.json(
      { error: "確認事項の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/checklist - Create a new checklist item
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const session = authResult.session;

    const body = await request.json();
    const { title, description, dueDate, priority } = body;

    if (!title) {
      return NextResponse.json(
        { error: "タイトルは必須です" },
        { status: 400 }
      );
    }

    const item = await prisma.checklistItem.create({
      data: {
        title,
        description: description || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        priority: priority || "medium",
        createdById: session.user?.id || null,
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Failed to create checklist item:", error);
    return NextResponse.json(
      { error: "確認事項の登録に失敗しました" },
      { status: 500 }
    );
  }
}
