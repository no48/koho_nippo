-- AlterTable: daily_reports - make fare nullable
ALTER TABLE "daily_reports" ALTER COLUMN "fare" DROP NOT NULL;
