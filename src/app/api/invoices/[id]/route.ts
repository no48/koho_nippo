import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// GET /api/invoices/[id]
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

    const invoice = await prisma.invoice.findUnique({
      where: { id: parsedId },
      include: {
        customer: true,
        items: {
          include: {
            dailyReport: {
              include: {
                employee: true,
                truck: true,
              },
            },
            dailyReports: {  // 請求書→日報フロー用
              include: {
                employee: true,
                truck: true,
              },
            },
          },
        },
      },
    });

    if (!invoice) {
      return NextResponse.json(
        { error: "請求書が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Failed to fetch invoice:", error);
    return NextResponse.json(
      { error: "請求書の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/invoices/[id]
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
    const { issueDate, items, status } = body;

    // Delete existing items and recreate
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: parsedId },
    });

    // Calculate subtotal
    const subtotal = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
    const tax = Math.floor(subtotal * 0.1);
    const total = subtotal + tax;

    const invoice = await prisma.invoice.update({
      where: { id: parsedId },
      data: {
        issueDate: new Date(issueDate),
        subtotal,
        tax,
        total,
        status: status || "draft",
        updatedById: session?.user?.id || null,
        items: {
          create: items.map((item: { dailyReportId?: number; itemDate?: string; description: string; amount: number; tollFee?: number }) => ({
            ...(item.dailyReportId ? { dailyReport: { connect: { id: item.dailyReportId } } } : {}),
            itemDate: item.itemDate ? new Date(item.itemDate) : new Date(issueDate),
            description: item.description,
            amount: item.amount,
            tollFee: item.tollFee ?? 0,
          })),
        },
      },
      include: {
        customer: true,
        items: {
          include: {
            dailyReport: true,
          },
        },
      },
    });

    return NextResponse.json(invoice);
  } catch (error) {
    console.error("Failed to update invoice:", error);
    return NextResponse.json(
      { error: "請求書の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/invoices/[id]
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

    // Delete items first
    await prisma.invoiceItem.deleteMany({
      where: { invoiceId: parsedId },
    });

    await prisma.invoice.delete({
      where: { id: parsedId },
    });

    return NextResponse.json({ message: "請求書を削除しました" });
  } catch (error) {
    console.error("Failed to delete invoice:", error);
    return NextResponse.json(
      { error: "請求書の削除に失敗しました" },
      { status: 500 }
    );
  }
}
