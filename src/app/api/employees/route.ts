import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET /api/employees - 従業員一覧取得
export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const employees = await prisma.employee.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
      include: {
        trucks: {
          include: {
            truck: true,
          },
        },
      },
    });
    return NextResponse.json(employees);
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    return NextResponse.json(
      { error: "従業員の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/employees - 従業員登録
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { name, nameKana, phone, baseSalary, wageType, memo, truckIds } = body;

    if (!name || !nameKana) {
      return NextResponse.json(
        { error: "氏名とフリガナは必須です" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        nameKana,
        phone: phone || null,
        baseSalary: baseSalary ? parseInt(baseSalary) : null,
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

    return NextResponse.json(employee, { status: 201 });
  } catch (error) {
    console.error("Failed to create employee:", error);
    return NextResponse.json(
      { error: "従業員の登録に失敗しました" },
      { status: 500 }
    );
  }
}
