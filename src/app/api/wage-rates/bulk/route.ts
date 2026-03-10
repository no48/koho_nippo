import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// POST /api/wage-rates/bulk
// 一括インポート: 配列形式で複数の単価を一度に登録
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const body = await request.json();
    const { wageRates } = body;

    if (!Array.isArray(wageRates) || wageRates.length === 0) {
      return NextResponse.json(
        { error: "単価データの配列を指定してください" },
        { status: 400 }
      );
    }

    // トランザクションで一括処理
    const results = await prisma.$transaction(
      wageRates.map((item: { wageType: string; workItem: string; rate: number | string; sortOrder?: number | string }) => {
        const rateValue = typeof item.rate === "number" ? item.rate : parseInt(item.rate, 10);
        if (isNaN(rateValue)) {
          throw new Error(`無効な単価: ${item.rate}`);
        }
        const sortOrderValue = item.sortOrder !== undefined
          ? (typeof item.sortOrder === "number" ? item.sortOrder : parseInt(String(item.sortOrder), 10))
          : 0;
        return prisma.wageRate.upsert({
          where: {
            wageType_workItem: {
              wageType: item.wageType,
              workItem: item.workItem,
            },
          },
          update: {
            rate: rateValue,
            sortOrder: isNaN(sortOrderValue) ? 0 : sortOrderValue,
          },
          create: {
            wageType: item.wageType,
            workItem: item.workItem,
            rate: rateValue,
            sortOrder: isNaN(sortOrderValue) ? 0 : sortOrderValue,
          },
        });
      })
    );

    return NextResponse.json(
      { message: `${results.length}件の単価を登録しました`, count: results.length },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to bulk import wage rates:", error);
    return NextResponse.json(
      { error: "単価マスタの一括登録に失敗しました" },
      { status: 500 }
    );
  }
}
