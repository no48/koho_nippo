import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// GET /api/employees/[id]
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

    const employee = await prisma.employee.findUnique({
      where: { id: parsedId },
      include: {
        trucks: {
          include: {
            truck: true,
          },
        },
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "従業員が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Failed to fetch employee:", error);
    return NextResponse.json(
      { error: "従業員の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id]
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
    const { name, nameKana, phone, baseSalary, wageType, memo, truckIds } = body;

    if (!name || !nameKana) {
      return NextResponse.json(
        { error: "氏名とフリガナは必須です" },
        { status: 400 }
      );
    }

    await prisma.truckEmployee.deleteMany({
      where: { employeeId: parsedId },
    });

    const employee = await prisma.employee.update({
      where: { id: parsedId },
      data: {
        name,
        nameKana,
        phone: phone || null,
        baseSalary: safeParseInt(baseSalary),
        wageType: wageType || null,
        memo: memo || null,
        trucks: truckIds?.length
          ? {
              create: truckIds.map((truckId: number) => ({
                truckId,
              })),
            }
          : undefined,
      },
      include: {
        trucks: {
          include: {
            truck: true,
          },
        },
      },
    });

    return NextResponse.json(employee);
  } catch (error) {
    console.error("Failed to update employee:", error);
    return NextResponse.json(
      { error: "従業員の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id]
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

    await prisma.employee.update({
      where: { id: parsedId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "従業員を削除しました" });
  } catch (error) {
    console.error("Failed to delete employee:", error);
    return NextResponse.json(
      { error: "従業員の削除に失敗しました" },
      { status: 500 }
    );
  }
}
