import { test as base } from "@playwright/test";
import { ApiHelper } from "../helpers/api.helper";

const PREFIX = "__e2e_test__";

type CleanupEntry = {
  type:
    | "invoice"
    | "report"
    | "payroll"
    | "truck"
    | "employee"
    | "customer"
    | "checklist";
  id: number;
};

/**
 * Extended test fixture with:
 * - api: ApiHelper for direct API calls
 * - cleanup: CleanupTracker that auto-deletes test data after each test
 * - testPrefix: consistent prefix for identifying test data
 */
export const test = base.extend<{
  api: ApiHelper;
  cleanup: CleanupTracker;
  testPrefix: string;
}>({
  api: async ({ request }, use) => {
    await use(new ApiHelper(request));
  },

  cleanup: async ({ request }, use) => {
    const tracker = new CleanupTracker(new ApiHelper(request));
    await use(tracker);
    await tracker.runCleanup();
  },

  testPrefix: async ({}, use) => {
    await use(PREFIX);
  },
});

export class CleanupTracker {
  private entries: CleanupEntry[] = [];

  constructor(private api: ApiHelper) {}

  track(type: CleanupEntry["type"], id: number) {
    this.entries.push({ type, id });
  }

  async runCleanup() {
    // Delete in reverse order to respect foreign key constraints:
    // invoices → reports → payrolls → trucks/employees/customers
    const deleteOrder: CleanupEntry["type"][] = [
      "invoice",
      "payroll",
      "report",
      "checklist",
      "truck",
      "employee",
      "customer",
    ];

    const sorted = [...this.entries].sort(
      (a, b) => deleteOrder.indexOf(a.type) - deleteOrder.indexOf(b.type)
    );

    for (const entry of sorted) {
      try {
        switch (entry.type) {
          case "truck":
            await this.api.deleteTruck(entry.id);
            break;
          case "employee":
            await this.api.deleteEmployee(entry.id);
            break;
          case "customer":
            await this.api.deleteCustomer(entry.id);
            break;
          case "report":
            await this.api.deleteReport(entry.id);
            break;
          case "invoice":
            await this.api.deleteInvoice(entry.id);
            break;
          case "payroll":
            await this.api.deletePayroll(entry.id);
            break;
          case "checklist":
            await this.api.deleteChecklistItem(entry.id);
            break;
        }
      } catch {
        // Best-effort cleanup — log but don't fail the test
        console.warn(`Cleanup failed for ${entry.type}#${entry.id}`);
      }
    }
  }
}

export { expect } from "@playwright/test";
