-- AlterTable: employees - add base_salary and wage_type
ALTER TABLE "employees" ADD COLUMN "base_salary" DECIMAL(10,0);
ALTER TABLE "employees" ADD COLUMN "wage_type" TEXT;

-- AlterTable: customers - add email
ALTER TABLE "customers" ADD COLUMN "email" TEXT;

-- AlterTable: daily_reports - add missing columns
ALTER TABLE "daily_reports" ADD COLUMN "report_number" TEXT;
ALTER TABLE "daily_reports" ADD COLUMN "report_type" TEXT;
ALTER TABLE "daily_reports" ADD COLUMN "product_name" TEXT;
ALTER TABLE "daily_reports" ADD COLUMN "quantity" INTEGER;
ALTER TABLE "daily_reports" ADD COLUMN "tonnage" DECIMAL(5,2);
ALTER TABLE "daily_reports" ADD COLUMN "salary" DECIMAL(12,0);
ALTER TABLE "daily_reports" ADD COLUMN "toll_fee" DECIMAL(12,0) DEFAULT 0;
ALTER TABLE "daily_reports" ADD COLUMN "distance_allowance" DECIMAL(12,0) DEFAULT 0;
ALTER TABLE "daily_reports" ADD COLUMN "invoice_item_id" INTEGER;
ALTER TABLE "daily_reports" ADD COLUMN "item_memo" TEXT;
ALTER TABLE "daily_reports" ADD COLUMN "work_items" TEXT;
ALTER TABLE "daily_reports" ADD COLUMN "wage_type" TEXT;
ALTER TABLE "daily_reports" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "daily_reports" ADD COLUMN "updated_by_id" TEXT;

-- Generate report_number for existing rows (if any)
UPDATE "daily_reports" SET "report_number" = 'LEGACY-' || "id" WHERE "report_number" IS NULL;
ALTER TABLE "daily_reports" ALTER COLUMN "report_number" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "daily_reports_report_number_key" ON "daily_reports"("report_number");

-- AlterTable: invoices - add created_by/updated_by
ALTER TABLE "invoices" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "invoices" ADD COLUMN "updated_by_id" TEXT;

-- AlterTable: invoice_items - add toll_fee
ALTER TABLE "invoice_items" ADD COLUMN "toll_fee" DECIMAL(12,0) DEFAULT 0;

-- AlterTable: payrolls - add created_by/updated_by
ALTER TABLE "payrolls" ADD COLUMN "created_by_id" TEXT;
ALTER TABLE "payrolls" ADD COLUMN "updated_by_id" TEXT;

-- CreateTable: checklist_items
CREATE TABLE "checklist_items" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "due_date" DATE,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_by_id" TEXT,
    "updated_by_id" TEXT,

    CONSTRAINT "checklist_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable: wage_rates
CREATE TABLE "wage_rates" (
    "id" SERIAL NOT NULL,
    "wage_type" TEXT NOT NULL,
    "work_item" TEXT NOT NULL,
    "rate" DECIMAL(10,0) NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "wage_rates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "wage_rates_wage_type_work_item_key" ON "wage_rates"("wage_type", "work_item");

-- AddForeignKey: daily_reports -> User (created_by)
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: daily_reports -> User (updated_by)
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: daily_reports -> invoice_items (invoice_item_id)
ALTER TABLE "daily_reports" ADD CONSTRAINT "daily_reports_invoice_item_id_fkey" FOREIGN KEY ("invoice_item_id") REFERENCES "invoice_items"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: invoices -> User (created_by)
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: invoices -> User (updated_by)
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: payrolls -> User (created_by)
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: payrolls -> User (updated_by)
ALTER TABLE "payrolls" ADD CONSTRAINT "payrolls_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: checklist_items -> User (created_by)
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey: checklist_items -> User (updated_by)
ALTER TABLE "checklist_items" ADD CONSTRAINT "checklist_items_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
