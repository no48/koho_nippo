import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderToBuffer } from "@react-pdf/renderer";
import { InvoicePDF } from "@/lib/invoice-pdf";
import { sendInvoiceEmail } from "@/lib/email";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

export async function POST(
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

    // Fetch invoice data with customer
    const invoice = await prisma.invoice.findUnique({
      where: { id: parsedId },
      include: {
        customer: true,
        items: {
          include: {
            dailyReport: true,
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

    // Check if customer has email
    if (!invoice.customer.email) {
      return NextResponse.json(
        { error: "得意先のメールアドレスが登録されていません" },
        { status: 400 }
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
      items: invoice.items.map((item) => ({
        id: item.id,
        itemDate: item.dailyReport?.reportDate?.toISOString() || new Date().toISOString(),
        description: item.description,
        amount: item.amount.toString(),
        dailyReport: item.dailyReport ? {
          origin: item.dailyReport.origin,
          destination: item.dailyReport.destination,
          productName: item.dailyReport.productName,
          tollFee: item.dailyReport.tollFee?.toString() || null,
        } : null,
      })),
    };

    // Generate PDF
    const pdfBuffer = await renderToBuffer(
      InvoicePDF({ invoice: invoiceData, settings })
    );

    // Send email
    await sendInvoiceEmail({
      to: invoice.customer.email,
      customerName: invoice.customer.name,
      invoiceNumber: invoice.invoiceNumber,
      issueDate: invoice.issueDate.toISOString(),
      total: invoice.total.toString(),
      pdfBuffer: Buffer.from(pdfBuffer),
    });

    return NextResponse.json({
      message: `請求書を ${invoice.customer.email} に送信しました`,
    });
  } catch (error) {
    console.error("Failed to send email:", error);
    return NextResponse.json(
      { error: "メールの送信に失敗しました" },
      { status: 500 }
    );
  }
}
