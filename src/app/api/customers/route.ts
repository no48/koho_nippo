import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET /api/customers
export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
    });
    return NextResponse.json(customers);
  } catch (error) {
    console.error("Failed to fetch customers:", error);
    return NextResponse.json(
      { error: "得意先の取得に失敗しました" },
      { status: 500 }
    );
  }
}

// POST /api/customers
export async function POST(request: Request) {
  const authResult = await requireAuth();
  if (authResult.error) return authResult.error;

  try {
    const body = await request.json();
    const { name, address, phone, email, contactPerson, memo } = body;

    if (!name) {
      return NextResponse.json(
        { error: "得意先名は必須です" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        email: email || null,
        contactPerson: contactPerson || null,
        memo: memo || null,
      },
    });

    return NextResponse.json(customer, { status: 201 });
  } catch (error) {
    console.error("Failed to create customer:", error);
    return NextResponse.json(
      { error: "得意先の登録に失敗しました" },
      { status: 500 }
    );
  }
}
