import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating sample invoices...");

  // 得意先ごとに未請求の日報を取得して請求書を作成
  const customers = await prisma.customer.findMany();

  let invoiceCount = 0;

  for (const customer of customers) {
    // この得意先の未請求日報を取得（古い順）
    const unbilledReports = await prisma.dailyReport.findMany({
      where: {
        customerId: customer.id,
        invoiceItems: { none: {} },
      },
      orderBy: { reportDate: "asc" },
    });

    if (unbilledReports.length === 0) continue;

    // 最初の5-10件で請求書を作成（ランダム）
    const reportsToInvoice = unbilledReports.slice(0, Math.floor(Math.random() * 6) + 5);

    if (reportsToInvoice.length < 3) continue;

    // 小計を計算
    const subtotal = reportsToInvoice.reduce((sum, r) => sum + Number(r.fare), 0);
    const tax = Math.floor(subtotal * 0.1);
    const total = subtotal + tax;

    // 請求書番号を生成
    const now = new Date();
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
    const existingInvoices = await prisma.invoice.count({
      where: { invoiceNumber: { startsWith: dateStr } },
    });
    const invoiceNumber = `${dateStr}-${String(existingInvoices + 1).padStart(3, "0")}`;

    // 請求書を作成
    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        customerId: customer.id,
        issueDate: now,
        subtotal,
        tax,
        total,
        status: "issued",
        items: {
          create: reportsToInvoice.map((r) => {
            const reportDate = new Date(r.reportDate);
            return {
              dailyReportId: r.id,
              itemDate: r.reportDate,
              description: `${reportDate.getMonth() + 1}/${reportDate.getDate()} ${r.origin} → ${r.destination}`,
              amount: r.fare,
            };
          }),
        },
      },
    });

    console.log(`Created invoice ${invoice.invoiceNumber} for ${customer.name} (${reportsToInvoice.length} items, ¥${total.toLocaleString()})`);
    invoiceCount++;
  }

  console.log(`\nCreated ${invoiceCount} invoices!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
