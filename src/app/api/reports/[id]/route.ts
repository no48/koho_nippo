import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// GET /api/reports/[id]
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

    const report = await prisma.dailyReport.findUnique({
      where: { id: parsedId },
      include: {
        employee: true,
        truck: true,
        customer: true,
      },
    });

    if (!report) {
      return NextResponse.json(
        { error: "日報が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to fetch report:", error);
    return NextResponse.json(
      { error: "日報の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/reports/[id]
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
    const {
      reportDate,
      reportType,
      employeeId,
      truckId,
      customerId,
      origin,
      destination,
      destinationAddress,
      productName,
      quantity,
      fare,
      salary,
      tollFee,
      distanceAllowance,
      workItems,
      wageType,
      memo,
    } = body;

    if (!reportDate || !employeeId || !customerId || !origin || !destination) {
      return NextResponse.json(
        { error: "必須項目を入力してください" },
        { status: 400 }
      );
    }

    // IDフィールドのバリデーション
    const parsedEmployeeId = safeParseInt(employeeId);
    const parsedTruckId = safeParseInt(truckId);
    const parsedCustomerId = safeParseInt(customerId);
    const parsedFare =
      fare === "" || fare === null || fare === undefined
        ? null
        : safeParseInt(fare);

    if (parsedEmployeeId === null) {
      return NextResponse.json({ error: "従業員IDは有効な数値を入力してください" }, { status: 400 });
    }
    if (parsedCustomerId === null) {
      return NextResponse.json({ error: "発注元IDは有効な数値を入力してください" }, { status: 400 });
    }
    // 運賃が入力されている場合のみ数値チェック
    if (fare !== "" && fare !== null && fare !== undefined && parsedFare === null) {
      return NextResponse.json({ error: "運賃は有効な数値を入力してください" }, { status: 400 });
    }

    const report = await prisma.dailyReport.update({
      where: { id: parsedId },
      data: {
        reportDate: new Date(reportDate),
        reportType: reportType || null,
        employeeId: parsedEmployeeId,
        truckId: parsedTruckId || null,
        customerId: parsedCustomerId,
        origin,
        destination,
        destinationAddress: destinationAddress || null,
        productName: productName || null,
        quantity: safeParseInt(quantity),
        fare: parsedFare,
        salary: safeParseInt(salary),
        tollFee: safeParseInt(tollFee) ?? 0,
        distanceAllowance: safeParseInt(distanceAllowance) ?? 0,
        workItems: workItems || null,
        wageType: wageType || null,
        memo: memo || null,
        updatedById: session?.user?.id || null,
      },
      include: {
        employee: true,
        truck: true,
        customer: true,
      },
    });

    return NextResponse.json(report);
  } catch (error) {
    console.error("Failed to update report:", error);
    return NextResponse.json(
      { error: "日報の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/reports/[id]
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

    await prisma.dailyReport.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({ message: "日報を削除しました" });
  } catch (error) {
    console.error("Failed to delete report:", error);
    return NextResponse.json(
      { error: "日報の削除に失敗しました" },
      { status: 500 }
    );
  }
}
