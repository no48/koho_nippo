import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// PATCH /api/reports/[id]/salary - Update only the salary field
export async function PATCH(
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
    const { salary } = body;

    const report = await prisma.dailyReport.update({
      where: { id: parsedId },
      data: {
        salary: salary !== null && salary !== "" ? safeParseInt(salary) : null,
        updatedById: session?.user?.id || null,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to update salary:", error);
    return NextResponse.json(
      { error: "給与の更新に失敗しました" },
      { status: 500 }
    );
  }
}
