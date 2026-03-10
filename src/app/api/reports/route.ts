import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";
import { getPayrollPeriod } from "@/lib/payroll-period";

// GET /api/reports
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const searchParams = request.nextUrl.searchParams;
    const year = searchParams.get("year");
    const month = searchParams.get("month");
    const employeeId = searchParams.get("employeeId");
    const customerId = searchParams.get("customerId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    // Build where clause
    const where: Record<string, unknown> = {};

    // Date filtering (25日締め期間で絞り込み)
    const parsedYear = safeParseInt(year);
    const parsedMonth = safeParseInt(month);
    if (parsedYear !== null && parsedMonth !== null) {
      // 25日締め期間を取得（例: 1月 = 12/26〜1/25）
      const yearMonth = `${parsedYear}-${String(parsedMonth).padStart(2, "0")}`;
      const period = getPayrollPeriod(yearMonth);
      where.reportDate = {
        gte: period.startDate,
        lte: period.endDate,
      };
    } else if (startDate && endDate) {
      where.reportDate = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Employee filtering
    const parsedEmployeeId = safeParseInt(employeeId);
    if (parsedEmployeeId !== null) {
      where.employeeId = parsedEmployeeId;
    }

    // Customer filtering
    const parsedCustomerId = safeParseInt(customerId);
    if (parsedCustomerId !== null) {
      where.customerId = parsedCustomerId;
    }

    const reports = await prisma.dailyReport.findMany({
      where,
      include: {
        employee: true,
        truck: true,
        customer: true,
      },
      orderBy: { reportDate: "desc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to fetch reports:", error);
    return NextResponse.json(
      { error: "日報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/reports
export async function POST(request: Request) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const session = authResult.session;

    const body = await request.json();
    const {
      reportDate,
      reportType,
      employeeId,
      truckId,
      customerId,
      origin,
      destination,
      productName,
      fare,
      salary,
      tollFee,
      distanceAllowance,
      workItems,
      wageType,
      memo,
      invoiceItemId,  // 請求書→日報フロー用
    } = body;

    if (!reportDate || !employeeId || !customerId || !origin || !destination || fare === undefined) {
      return NextResponse.json(
        { error: "必須項目を入力してください" },
        { status: 400 }
      );
    }

    // 必須IDのバリデーション
    const parsedEmployeeId = safeParseInt(employeeId);
    const parsedTruckId = safeParseInt(truckId);
    const parsedCustomerId = safeParseInt(customerId);
    const parsedFare = safeParseInt(fare);

    if (parsedEmployeeId === null) {
      return NextResponse.json({ error: "従業員IDは有効な数値を入力してください" }, { status: 400 });
    }
    if (parsedCustomerId === null) {
      return NextResponse.json({ error: "得意先IDは有効な数値を入力してください" }, { status: 400 });
    }
    if (parsedFare === null) {
      return NextResponse.json({ error: "運賃は有効な数値を入力してください" }, { status: 400 });
    }

    // Use transaction to prevent race condition on report number
    const report = await prisma.$transaction(async (tx) => {
      // Generate report number (YYYYMMDD-XXX format)
      const date = new Date(reportDate);
      const dateStr = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;

      const lastReport = await tx.dailyReport.findFirst({
        where: {
          reportNumber: {
            startsWith: dateStr,
          },
        },
        orderBy: { reportNumber: "desc" },
      });

      let sequence = 1;
      if (lastReport) {
        const lastSequence = safeParseInt(lastReport.reportNumber.split("-")[1]) || 0;
        sequence = lastSequence + 1;
      }
      const reportNumber = `${dateStr}-${String(sequence).padStart(3, "0")}`;

      return tx.dailyReport.create({
        data: {
          reportNumber,
          reportDate: new Date(reportDate),
          reportType: reportType || null,
          employeeId: parsedEmployeeId,
          truckId: parsedTruckId || null,
          customerId: parsedCustomerId,
          origin,
          destination,
          productName: productName || null,
          fare: parsedFare,
          salary: safeParseInt(salary),
          tollFee: safeParseInt(tollFee) ?? 0,
          distanceAllowance: safeParseInt(distanceAllowance) ?? 0,
          workItems: workItems || null,
          wageType: wageType || null,
          memo: memo || null,
          createdById: session?.user?.id || null,
          invoiceItemId: safeParseInt(invoiceItemId),  // 請求書→日報フロー用
        },
        include: {
          employee: true,
          truck: true,
          customer: true,
        },
      });
    });

    return NextResponse.json(report, { status: 201 });
  } catch (error) {
    console.error("Failed to create report:", error);
    return NextResponse.json(
      { error: "日報の登録に失敗しました" },
      { status: 500 }
    );
  }
}
