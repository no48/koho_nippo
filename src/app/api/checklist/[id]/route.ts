import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// PUT /api/checklist/[id] - Update a checklist item
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const session = authResult.session;

    const { id } = await params;
    const parsedId = safeParseInt(id);
    if (parsedId === null) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const body = await request.json();
    const { title, description, isCompleted, dueDate, priority } = body;

    const item = await prisma.checklistItem.update({
      where: { id: parsedId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description: description || null }),
        ...(isCompleted !== undefined && { isCompleted }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(priority !== undefined && { priority }),
        updatedById: session?.user?.id || null,
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    console.error("Failed to update checklist item:", error);
    return NextResponse.json(
      { error: "確認事項の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/checklist/[id] - Delete a checklist item
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const { id } = await params;
    const parsedId = safeParseInt(id);
    if (parsedId === null) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    await prisma.checklistItem.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({ message: "確認事項を削除しました" });
  } catch (error) {
    console.error("Failed to delete checklist item:", error);
    return NextResponse.json(
      { error: "確認事項の削除に失敗しました" },
      { status: 500 }
    );
  }
}
