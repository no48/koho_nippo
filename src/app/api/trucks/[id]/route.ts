import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// GET /api/trucks/[id] - トラック詳細取得
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const parsedId = safeParseInt(id);
    if (parsedId === null) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const truck = await prisma.truck.findUnique({
      where: { id: parsedId },
      include: {
        employees: {
          include: {
            employee: true,
          },
        },
      },
    });

    if (!truck) {
      return NextResponse.json(
        { error: "トラックが見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(truck);
  } catch (error) {
    console.error("Failed to fetch truck:", error);
    return NextResponse.json(
      { error: "トラックの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/trucks/[id] - トラック更新
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const parsedId = safeParseInt(id);
    if (parsedId === null) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const body = await request.json();
    const { vehicleNumber, vehicleName, memo, employeeIds } = body;

    if (!vehicleNumber || !vehicleName) {
      return NextResponse.json(
        { error: "車両番号と車種名は必須です" },
        { status: 400 }
      );
    }

    // 既存の紐付けを削除して新しい紐付けを作成
    await prisma.truckEmployee.deleteMany({
      where: { truckId: parsedId },
    });

    const truck = await prisma.truck.update({
      where: { id: parsedId },
      data: {
        vehicleNumber,
        vehicleName,
        memo: memo || null,
        employees: employeeIds?.length
          ? {
              create: employeeIds.map((employeeId: number) => ({
                employeeId,
              })),
            }
          : undefined,
      },
      include: {
        employees: {
          include: {
            employee: true,
          },
        },
      },
    });

    return NextResponse.json(truck);
  } catch (error) {
    console.error("Failed to update truck:", error);
    return NextResponse.json(
      { error: "トラックの更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/trucks/[id] - トラック削除（論理削除）
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const parsedId = safeParseInt(id);
    if (parsedId === null) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    await prisma.truck.update({
      where: { id: parsedId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "トラックを削除しました" });
  } catch (error) {
    console.error("Failed to delete truck:", error);
    return NextResponse.json(
      { error: "トラックの削除に失敗しました" },
      { status: 500 }
    );
  }
}
