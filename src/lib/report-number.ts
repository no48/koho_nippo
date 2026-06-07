import type { Prisma } from "@prisma/client";
import { safeParseInt } from "./api-auth";

/**
 * 同一トランザクション内で日報番号(YYYYMMDD-XXX)を採番する。
 * トランザクション内で順次呼べば、直前に作成した日報も考慮して連番になる。
 */
export async function generateReportNumber(
  tx: Prisma.TransactionClient,
  reportDate: Date
): Promise<string> {
  const dateStr = `${reportDate.getFullYear()}${String(reportDate.getMonth() + 1).padStart(2, "0")}${String(reportDate.getDate()).padStart(2, "0")}`;

  const last = await tx.dailyReport.findFirst({
    where: { reportNumber: { startsWith: dateStr } },
    orderBy: { reportNumber: "desc" },
  });

  let sequence = 1;
  if (last) {
    const lastSequence = safeParseInt(last.reportNumber.split("-")[1]) || 0;
    sequence = lastSequence + 1;
  }
  return `${dateStr}-${String(sequence).padStart(3, "0")}`;
}
