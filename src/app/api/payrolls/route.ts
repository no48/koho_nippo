import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";
import { getPayrollPeriod } from "@/lib/payroll-period";

// GET /api/payrolls
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const searchParams = request.nextUrl.searchParams;
    const employeeId = searchParams.get("employeeId");
    const yearMonth = searchParams.get("yearMonth");

    const where: Record<string, unknown> = {};

    const parsedEmployeeId = safeParseInt(employeeId);
    if (parsedEmployeeId !== null) {
      where.employeeId = parsedEmployeeId;
    }

    if (yearMonth) {
      where.yearMonth = yearMonth;
    }

    const payrolls = await prisma.payroll.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: [{ yearMonth: "desc" }, { employee: { name: "asc" } }],
    });

    // Calculate daily report salaries for each payroll
    const payrollsWithSalary = await Promise.all(
      payrolls.map(async (payroll) => {
        // 25日締め期間を取得（例: 1月分 = 12/26〜1/25）
        const { startDate, endDate } = getPayrollPeriod(payroll.yearMonth);

        const reports = await prisma.dailyReport.findMany({
          where: {
            employeeId: payroll.employeeId,
            reportDate: {
              gte: startDate,
              lte: endDate,
            },
          },
          select: { salary: true },
        });

        const totalSalary = reports.reduce((sum, r) => {
          if (!r.salary) return sum;
          return sum + Number(r.salary);
        }, 0);

        // Calculate actual gross pay including daily report salaries
        const actualGrossPay = Number(payroll.grossPay) + totalSalary;

        // Calculate actual net pay (actualGrossPay - deductions)
        const actualNetPay = actualGrossPay - Number(payroll.totalDeduction);

        return {
          ...payroll,
          totalSalary,
          actualGrossPay,
          actualNetPay,
        };
      })
    );

    return NextResponse.json(payrollsWithSalary);
  } catch (error) {
    console.error("Failed to fetch payrolls:", error);
    return NextResponse.json(
      { error: "給料明細の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/payrolls
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const session = authResult.session;

    const body = await request.json();
    const { employeeId, yearMonth, baseSalary, allowances, deductions } = body;

    if (!employeeId || !yearMonth) {
      return NextResponse.json(
        { error: "従業員と対象月は必須です" },
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

    // Check for existing payroll
    const existing = await prisma.payroll.findFirst({
      where: {
        employeeId: parsedEmployeeId,
        yearMonth,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "この従業員の当月の給料明細は既に存在します" },
        { status: 400 }
      );
    }

    // Calculate pay
    const base = safeParseInt(baseSalary) ?? 0;
    const allowanceTotal = Object.values(allowances || {}).reduce(
      (sum: number, val) => sum + (safeParseInt(val as string) ?? 0),
      0
    );
    const deductionTotal = Object.values(deductions || {}).reduce(
      (sum: number, val) => sum + (safeParseInt(val as string) ?? 0),
      0
    );
    const grossPay = base + allowanceTotal;
    const netPay = grossPay - deductionTotal;

    const payroll = await prisma.payroll.create({
      data: {
        employeeId: parsedEmployeeId,
        yearMonth,
        baseSalary: base,
        allowances: allowances || {},
        deductions: deductions || {},
        grossPay,
        totalDeduction: deductionTotal,
        netPay,
        createdById: session?.user?.id || null,
      },
      include: {
        employee: true,
      },
    });

    return NextResponse.json(payroll, { status: 201 });
  } catch (error) {
    console.error("Failed to create payroll:", error);
    return NextResponse.json(
      { error: "給料明細の作成に失敗しました" },
      { status: 500 }
    );
  }
}
