import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";
import { getPayrollPeriod } from "@/lib/payroll-period";

// GET /api/reports/by-employee - Get daily reports for a specific employee in a month
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const yearMonth = searchParams.get("yearMonth"); // Format: YYYY-MM

    if (!employeeId || !yearMonth) {
      return NextResponse.json(
        { error: "従業員IDと対象月は必須です" },
        { status: 400 }
      );
    }

    const parsedEmployeeId = safeParseInt(employeeId);
    if (parsedEmployeeId === null) {
      return NextResponse.json(
        { error: "従業員IDは有効な数値を入力してください" },
        { status: 400 }
      );
    }

    // 25日締め期間を取得（例: 1月分 = 12/26〜1/25）
    const { startDate, endDate } = getPayrollPeriod(yearMonth);

    const reports = await prisma.dailyReport.findMany({
      where: {
        employeeId: parsedEmployeeId,
        reportDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        truck: true,
        customer: true,
      },
      orderBy: { reportDate: "asc" },
    });

    // Calculate summary
    const totalFare = reports.reduce((sum, r) => {
      const fare = typeof r.fare === "object" ? Number(r.fare) : r.fare;
      return sum + fare;
    }, 0);

    const totalSalary = reports.reduce((sum, r) => {
      if (!r.salary) return sum;
      const salary = typeof r.salary === "object" ? Number(r.salary) : r.salary;
      return sum + salary;
    }, 0);

    return NextResponse.json({
      reports,
      summary: {
        count: reports.length,
        totalFare,
        totalSalary,
      },
    });
  } catch (error) {
    console.error("Failed to fetch reports by employee:", error);
    return NextResponse.json(
      { error: "日報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
