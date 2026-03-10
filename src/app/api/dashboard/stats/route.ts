import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";
import { getCurrentPayrollPeriod } from "@/lib/payroll-period";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    // 25日締め期間を取得（例: 1/15なら12/26〜1/25）
    const { startDate, endDate } = getCurrentPayrollPeriod();

    const [truckCount, employeeCount, customerCount, monthlyReportCount, recentReports] =
      await Promise.all([
        prisma.truck.count({ where: { isActive: true } }),
        prisma.employee.count({ where: { isActive: true } }),
        prisma.customer.count({ where: { isActive: true } }),
        prisma.dailyReport.count({
          where: {
            reportDate: {
              gte: startDate,
              lte: endDate,
            },
          },
        }),
        prisma.dailyReport.findMany({
          take: 5,
          orderBy: { createdAt: "desc" },
          include: {
            employee: { select: { name: true } },
            customer: { select: { name: true } },
          },
        }),
      ]);

    return NextResponse.json({
      truckCount,
      employeeCount,
      customerCount,
      monthlyReportCount,
      recentReports,
    });
  } catch (error) {
    console.error("Failed to fetch dashboard stats:", error);
    return NextResponse.json(
      { error: "統計情報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
