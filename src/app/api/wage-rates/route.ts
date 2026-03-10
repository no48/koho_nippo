import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// GET /api/wage-rates
// クエリパラメータ: wageType (optional) - 特定の給与形態のみ取得
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const searchParams = request.nextUrl.searchParams;
    const wageType = searchParams.get("wageType");

    const where = wageType ? { wageType } : {};

    const wageRates = await prisma.wageRate.findMany({
      where,
      orderBy: [{ wageType: "asc" }, { sortOrder: "asc" }],
    });

    return NextResponse.json(wageRates);
  } catch (error) {
    console.error("Failed to fetch wage rates:", error);
    return NextResponse.json(
      { error: "単価マスタの取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/wage-rates
// Upsert: 既存があれば更新、なければ作成
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const body = await request.json();
    const { wageType, workItem, rate, sortOrder } = body;

    if (!wageType || !workItem || rate === undefined) {
      return NextResponse.json(
        { error: "給与形態、作業項目、単価は必須です" },
        { status: 400 }
      );
    }

    const parsedRate = safeParseInt(rate);
    if (parsedRate === null) {
      return NextResponse.json(
        { error: "単価は有効な数値を入力してください" },
        { status: 400 }
      );
    }

    const wageRate = await prisma.wageRate.upsert({
      where: {
        wageType_workItem: { wageType, workItem },
      },
      update: {
        rate: parsedRate,
        sortOrder: safeParseInt(sortOrder) ?? 0,
      },
      create: {
        wageType,
        workItem,
        rate: parsedRate,
        sortOrder: safeParseInt(sortOrder) ?? 0,
      },
    });

    return NextResponse.json(wageRate, { status: 201 });
  } catch (error) {
    console.error("Failed to save wage rate:", error);
    return NextResponse.json(
      { error: "単価マスタの保存に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/wage-rates
// クエリパラメータ: id または wageType + workItem
export async function DELETE(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const searchParams = request.nextUrl.searchParams;
    const id = searchParams.get("id");
    const wageType = searchParams.get("wageType");
    const workItem = searchParams.get("workItem");

    if (id) {
      const parsedId = safeParseInt(id);
      if (parsedId === null) {
        return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
      }
      await prisma.wageRate.delete({
        where: { id: parsedId },
      });
    } else if (wageType && workItem) {
      await prisma.wageRate.delete({
        where: {
          wageType_workItem: { wageType, workItem },
        },
      });
    } else {
      return NextResponse.json(
        { error: "IDまたは給与形態・作業項目を指定してください" },
        { status: 400 }
      );
    }

    return NextResponse.json({ message: "単価を削除しました" });
  } catch (error) {
    console.error("Failed to delete wage rate:", error);
    return NextResponse.json(
      { error: "単価マスタの削除に失敗しました" },
      { status: 500 }
    );
  }
}
