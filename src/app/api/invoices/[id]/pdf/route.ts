import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/lib/invoice-pdf";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const { id } = await params;
    const parsedId = safeParseInt(id);
    if (parsedId === null) {
      return NextResponse.json({ error: "無効なIDです" }, { status: 400 });
    }

    // Fetch invoice data
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsedId },
      include: {
        customer: true,
        items: {
          include: {
            dailyReport: true,
            dailyReports: true,  // 請求書→日報フロー用
          },
          orderBy: { itemDate: "asc" },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "請求書が見つかりません" },
        { status: 404 }
      );
    }

    // Fetch company settings
    const settingsRecords = await prisma.setting.findMany();
    const settings: Record<string, string> = {};
    settingsRecords.forEach((s) => {
      settings[s.key] = s.value;
    });

    // Transform invoice data for PDF
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      customer: {
        name: invoice.customer.name,
        address: invoice.customer.address,
      },
      subtotal: invoice.subtotal.toString(),
      tax: invoice.tax.toString(),
      total: invoice.total.toString(),
      items: invoice.items.map((item) => {
        // 通行料の計算（ソースは排他的に選択、二重計上を防止）
        let totalTollFee = 0;
        if (item.dailyReport?.tollFee) {
          // 日報→請求書フロー: 日報の通行料を使用
          totalTollFee = Number(item.dailyReport.tollFee);
        } else if (item.dailyReports && item.dailyReports.length > 0) {
          // 請求書→日報フロー: 紐付け日報の通行料合計を使用
          totalTollFee = item.dailyReports.reduce((sum, r) => sum + Number(r.tollFee ?? 0), 0);
        } else {
          // 手動入力のみ: 明細の通行料を使用
          totalTollFee = Number(item.tollFee ?? 0);
        }

        // 発着地と品名（日報から取得、複数ソースを考慮）
        const origin = item.dailyReport?.origin || item.dailyReports?.[0]?.origin || null;
        const destination = item.dailyReport?.destination || item.dailyReports?.[0]?.destination || null;
        const productName = item.dailyReport?.productName || item.dailyReports?.[0]?.productName || null;

        return {
          id: item.id,
          itemDate: item.itemDate.toISOString(),
          description: item.description,
          amount: item.amount.toString(),
          dailyReport: {
            origin,
            destination,
            productName,
            tollFee: totalTollFee > 0 ? totalTollFee.toString() : null,
          },
        };
      }),
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      InvoicePDF({ invoice: invoiceData, settings })
    );

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error("Failed to generate PDF:", error);
    return NextResponse.json(
      { error: "PDFの生成に失敗しました" },
      { status: 500 }
    );
  }
}
