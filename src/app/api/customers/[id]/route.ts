import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";

// GET /api/customers/[id]
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

    const customer = await prisma.customer.findUnique({
      where: { id: parsedId },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "発注元が見つかりません" },
        { status: 404 }
      );
    }

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Failed to fetch customer:", error);
    return NextResponse.json(
      { error: "発注元の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// PUT /api/customers/[id]
export async function PUT(
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

    const body = await request.json();
    const { name, address, phone, fax, email, closingDay, contactPerson, memo } = body;

    if (!name) {
      return NextResponse.json(
        { error: "発注元名は必須です" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id: parsedId },
      data: {
        name,
        address: address || null,
        phone: phone || null,
        fax: fax || null,
        email: email || null,
        closingDay: closingDay || null,
        contactPerson: contactPerson || null,
        memo: memo || null,
      },
    });

    return NextResponse.json(customer);
  } catch (error) {
    console.error("Failed to update customer:", error);
    return NextResponse.json(
      { error: "発注元の更新に失敗しました" },
      { status: 500 }
    );
  }
}

// DELETE /api/customers/[id]
export async function DELETE(
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

    await prisma.customer.update({
      where: { id: parsedId },
      data: { isActive: false },
    });

    return NextResponse.json({ message: "発注元を削除しました" });
  } catch (error) {
    console.error("Failed to delete customer:", error);
    return NextResponse.json(
      { error: "発注元の削除に失敗しました" },
      { status: 500 }
    );
  }
}
