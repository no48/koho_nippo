import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";
import { generateReportNumber } from "@/lib/report-number";

type BatchRow = {
  customerId?: string;
  origin?: string;
  destination?: string;
  destinationAddress?: string;
  productName?: string;
  quantity?: string;
  salary?: string;
  fare?: string;
  tollFee?: string;
  distanceAllowance?: string;
  wageType?: string;
};

// POST /api/reports/batch - 同一の日付/従業員/トラックで複数日報を一括作成
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const session = authResult.session;

    const body = await request.json();
    const { reportDate, employeeId, truckId, reportType, rows } = body as {
      reportDate?: string;
      employeeId?: string;
      truckId?: string;
      reportType?: string;
      rows?: BatchRow[];
    };

    if (!reportDate || !employeeId) {
      return NextResponse.json({ error: "日付と従業員は必須です" }, { status: 400 });
    }
    const parsedEmployeeId = safeParseInt(employeeId);
    if (parsedEmployeeId === null) {
      return NextResponse.json({ error: "従業員IDは有効な数値を入力してください" }, { status: 400 });
    }
    const parsedTruckId = safeParseInt(truckId);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "明細行がありません" }, { status: 400 });
    }

    // 完全な空行はスキップ、一部入力で必須欠けはエラー
    const isEmptyRow = (r: BatchRow) =>
      !r.customerId && !r.origin && !r.destination && !r.destinationAddress &&
      !r.productName && !r.quantity && !r.salary && !r.fare && !r.tollFee &&
      !r.distanceAllowance && !r.wageType;

    const validRows: { customerId: number; origin: string; destination: string; row: BatchRow }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (isEmptyRow(r)) continue;
      const cid = safeParseInt(r.customerId);
      if (cid === null || !r.origin || !r.destination) {
        return NextResponse.json(
          { error: `${i + 1}行目: 得意先・発地・着地は必須です` },
          { status: 400 }
        );
      }
      validRows.push({ customerId: cid, origin: r.origin, destination: r.destination, row: r });
    }

    if (validRows.length === 0) {
      return NextResponse.json({ error: "入力された明細行がありません" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const v of validRows) {
        const reportNumber = await generateReportNumber(tx, new Date(reportDate));
        const r = v.row;
        const parsedFare =
          r.fare === "" || r.fare === null || r.fare === undefined ? null : safeParseInt(r.fare);
        const report = await tx.dailyReport.create({
          data: {
            reportNumber,
            reportDate: new Date(reportDate),
            reportType: reportType || null,
            employeeId: parsedEmployeeId,
            truckId: parsedTruckId || null,
            customerId: v.customerId,
            origin: v.origin,
            destination: v.destination,
            destinationAddress: r.destinationAddress || null,
            productName: r.productName || null,
            quantity: safeParseInt(r.quantity),
            fare: parsedFare,
            salary: safeParseInt(r.salary),
            tollFee: safeParseInt(r.tollFee) ?? 0,
            distanceAllowance: safeParseInt(r.distanceAllowance) ?? 0,
            wageType: r.wageType || null,
            createdById: session?.user?.id || null,
          },
        });
        results.push(report);
      }
      return results;
    });

    return NextResponse.json({ count: created.length, reports: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to batch create reports:", error);
    return NextResponse.json({ error: "日報の一括登録に失敗しました" }, { status: 500 });
  }
}
