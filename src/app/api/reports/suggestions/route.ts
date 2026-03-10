import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/api-auth";

// GET /api/reports/suggestions - Get unique origins and destinations for autocomplete
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const searchParams = request.nextUrl.searchParams;
    const field = searchParams.get("field"); // "origin" or "destination"
    const query = searchParams.get("query") || "";

    if (!field || (field !== "origin" && field !== "destination")) {
      return NextResponse.json(
        { error: "field parameter must be 'origin' or 'destination'" },
        { status: 400 }
      );
    }

    // Get distinct values that match the query
    const whereClause = query
      ? {
          [field]: {
            contains: query,
            mode: "insensitive" as const,
          },
        }
      : {};

    const reports = await prisma.dailyReport.findMany({
      where: whereClause,
      select: {
        [field]: true,
      },
      distinct: [field],
      take: 50,
      orderBy: {
        [field]: "asc",
      },
    });

    const suggestions = reports.map((r) => r[field as keyof typeof r]);

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error("Failed to fetch suggestions:", error);
    return NextResponse.json(
      { error: "候補の取得に失敗しました" },
      { status: 500 }
    );
  }
}
