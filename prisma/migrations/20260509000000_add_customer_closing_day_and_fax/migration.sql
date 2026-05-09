-- AlterTable: customers - add fax and closing_day
ALTER TABLE "customers" ADD COLUMN "fax" TEXT;
ALTER TABLE "customers" ADD COLUMN "closing_day" TEXT;
