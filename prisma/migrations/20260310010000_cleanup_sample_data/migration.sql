-- Cleanup: Remove all sample data, keep only admin user and company settings
DELETE FROM "daily_reports";
DELETE FROM "invoice_items";
DELETE FROM "invoices";
DELETE FROM "payrolls";
DELETE FROM "truck_employee";
DELETE FROM "checklist_items";
DELETE FROM "employees";
DELETE FROM "trucks";
DELETE FROM "customers";
