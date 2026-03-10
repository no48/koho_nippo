import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET /api/reports/by-ids - Get reports by IDs
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const searchParams = request.nextUrl.searchParams;
    const idsParam = searchParams.get("ids");

    if (!idsParam) {
      return NextResponse.json(
        { error: "ids parameter is required" },
        { status: 400 }
      );
    }

    const ids = idsParam
      .split(",")
      .map((id) => parseInt(id))
      .filter((id) => !isNaN(id));

    if (ids.length === 0) {
      return NextResponse.json([]);
    }

    const reports = await prisma.dailyReport.findMany({
      where: {
        id: { in: ids },
      },
      include: {
        employee: {
          select: { id: true, name: true },
        },
        truck: {
          select: { id: true, vehicleNumber: true },
        },
        customer: {
          select: { id: true, name: true },
        },
      },
      orderBy: { reportDate: "asc" },
    });

    return NextResponse.json(reports);
  } catch (error) {
    console.error("Failed to fetch reports by IDs:", error);
    return NextResponse.json(
      { error: "日報の取得に失敗しました" },
      { status: 500 }
    );
  }
}
