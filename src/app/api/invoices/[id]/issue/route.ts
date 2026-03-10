import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// POST /api/invoices/[id]/issue - Change status to issued
export async function POST(
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

    const invoice = await prisma.invoice.update({
      where: { id: parsedId },
      data: { status: "issued" },
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
    console.error("Failed to issue invoice:", error);
    return NextResponse.json(
      { error: "請求書の発行に失敗しました" },
      { status: 500 }
    );
  }
}
