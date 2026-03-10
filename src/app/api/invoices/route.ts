import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// GET /api/invoices
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;

    const searchParams = request.nextUrl.searchParams;
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");

    const where: Record<string, unknown> = {};

    if (customerId) {
      const parsedCustomerId = safeParseInt(customerId);
      if (parsedCustomerId !== null) {
        where.customerId = parsedCustomerId;
      }
    }

    if (status) {
      where.status = status;
    }

    const invoices = await prisma.invoice.findMany({
      where,
      include: {
        customer: true,
        items: {
          include: {
            dailyReport: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error("Failed to fetch invoices:", error);
    return NextResponse.json(
      { error: "請求書の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/invoices
export async function POST(request: Request) {
  try {
    // 認証チェック
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const session = authResult.session;

    const body = await request.json();
    const { customerId, issueDate, items } = body;

    if (!customerId || !issueDate || !items || items.length === 0) {
      return NextResponse.json(
        { error: "必須項目を入力してください" },
        { status: 400 }
      );
    }

    // customerIdのバリデーション
    const parsedCustomerId = safeParseInt(customerId);
    if (parsedCustomerId === null) {
      return NextResponse.json(
        { error: "得意先IDは有効な数値を入力してください" },
        { status: 400 }
      );
    }

    // Calculate subtotal
    const subtotal = items.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0);
    const tax = Math.floor(subtotal * 0.1); // 10% tax
    const total = subtotal + tax;

    // Use transaction to prevent race condition on invoice number
    const invoice = await prisma.$transaction(async (tx) => {
      // Generate invoice number (YYYYMM-XXX format)
      const now = new Date();
      const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;

      const lastInvoice = await tx.invoice.findFirst({
        where: {
          invoiceNumber: {
            startsWith: yearMonth,
          },
        },
        orderBy: { invoiceNumber: "desc" },
      });

      let sequence = 1;
      if (lastInvoice) {
        const lastSequence = safeParseInt(lastInvoice.invoiceNumber.split("-")[1]) || 0;
        sequence = lastSequence + 1;
      }

      const invoiceNumber = `${yearMonth}-${String(sequence).padStart(3, "0")}`;

      return tx.invoice.create({
        data: {
          invoiceNumber,
          customerId: parsedCustomerId,
          issueDate: new Date(issueDate),
          subtotal,
          tax,
          total,
          status: "draft",
          createdById: session?.user?.id || null,
          items: {
            create: items.map((item: { dailyReportId?: number; itemDate: string; description: string; amount: number; tollFee?: number }) => ({
              ...(item.dailyReportId ? { dailyReport: { connect: { id: item.dailyReportId } } } : {}),
              itemDate: new Date(item.itemDate),
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
    });

    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Failed to create invoice:", error);
    return NextResponse.json(
      { error: "請求書の作成に失敗しました" },
      { status: 500 }
    );
  }
}
