import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET /api/trucks - トラック一覧取得
export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const trucks = await prisma.truck.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        employees: {
          include: {
            employee: true,
          },
        },
      },
    });
    return NextResponse.json(trucks);
  } catch (error) {
    console.error("Failed to fetch trucks:", error);
    return NextResponse.json(
      { error: "トラックの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/trucks - トラック登録
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { vehicleNumber, vehicleName, memo, employeeIds } = body;

    if (!vehicleNumber || !vehicleName) {
      return NextResponse.json(
        { error: "車両番号と車種名は必須です" },
        { status: 400 }
      );
    }

    const truck = await prisma.truck.create({
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

    return NextResponse.json(truck, { status: 201 });
  } catch (error) {
    console.error("Failed to create truck:", error);
    return NextResponse.json(
      { error: "トラックの登録に失敗しました" },
      { status: 500 }
    );
  }
}
