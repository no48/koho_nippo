import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// GET /api/reports/unbilled - Get daily reports that are not yet billed
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { error: "得意先IDは必須です" },
        { status: 400 }
      );
    }

    const parsedCustomerId = safeParseInt(customerId);
    if (parsedCustomerId === null) {
      return NextResponse.json(
        { error: "得意先IDは有効な数値を入力してください" },
        { status: 400 }
      );
    }

    // Find all daily reports for this customer that are not in any invoice
    // 両方のフローをチェック:
    // 1. invoiceItems: { none: {} } - 日報→請求書フロー（InvoiceItem.dailyReportIdで紐付け）
    // 2. invoiceItemId: null - 請求書→日報フロー（DailyReport.invoiceItemIdで紐付け）
    const reports = await prisma.dailyReport.findMany({
      where: {
        customerId: parsedCustomerId,
        invoiceItems: {
          none: {},
        },
        invoiceItemId: null,  // 請求書→日報フローでも紐付けがないことを確認
      },
      include: {
        employee: true,
        truck: true,
        customer: true,
      },
      orderBy: { reportDate: "asc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to fetch unbilled reports:", error);
    return NextResponse.json(
      { error: "未請求日報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
