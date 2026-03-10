import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// GET /api/payrolls/[id]
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const { id } = await params;
    const parsedId = safeParseInt(id);
    if (parsedId === null) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const payroll = await prisma.payroll.findUnique({
      where: { id: parsedId },
      include: {
        employee: true,
      },
    });

    if (!payroll) {
      return NextResponse.json(
        { error: "給料明細が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(payroll);
  } catch (error) {
    console.error("Failed to fetch payroll:", error);
    return NextResponse.json(
      { error: "給料明細の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/payrolls/[id]
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const session = authResult.session;

    const { id } = await params;
    const parsedId = safeParseInt(id);
    if (parsedId === null) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const body = await request.json();
    const { baseSalary, allowances, deductions } = body;

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

    const payroll = await prisma.payroll.update({
      where: { id: parsedId },
      data: {
        baseSalary: base,
        allowances: allowances || {},
        deductions: deductions || {},
        grossPay,
        totalDeduction: deductionTotal,
        netPay,
        updatedById: session?.user?.id || null,
      },
      include: {
        employee: true,
      },
    });

    return NextResponse.json(payroll);
  } catch (error) {
    console.error("Failed to update payroll:", error);
    return NextResponse.json(
      { error: "給料明細の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/payrolls/[id]
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const { id } = await params;
    const parsedId = safeParseInt(id);
    if (parsedId === null) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    const existing = await prisma.payroll.findUnique({
      where: { id: parsedId },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "給料明細が見つかりません" },
        { status: 404 }
      );
    }

    await prisma.payroll.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({ message: "給料明細を削除しました" });
  } catch (error) {
    console.error("Failed to delete payroll:", error);
    return NextResponse.json(
      { error: "給料明細の削除に失敗しました" },
      { status: 500 }
    );
  }
}
