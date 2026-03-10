import { test, expect } from "../fixtures/test-data.fixture";

test.describe("日報→請求書フロー", () => {
  test("日報を選択して請求書を作成し、金額を確認して発行する", async ({
    page,
    api,
    cleanup,
    testPrefix,
  }) => {
    // Prepare test data
    const customer = await api.createCustomer({
      name: `${testPrefix}フロー得意先`,
    });
    cleanup.track("customer", customer.id);

    const truck = await api.createTruck({
      vehicleNumber: `${testPrefix}フロー 100 あ 0001`,
      vehicleName: `${testPrefix}フロー4t`,
    });
    cleanup.track("truck", truck.id);

    const employee = await api.createEmployee({
      name: `${testPrefix}フロー太郎`,
      nameKana: `${testPrefix}フロータロウ`,
    });
    cleanup.track("employee", employee.id);

    // Create two reports for this customer in the current pay period
    const today = new Date();
    const day = Math.min(today.getDate(), 24); // Stay within current period
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const report1 = await api.createReport({
      reportDate: dateStr,
      employeeId: employee.id,
      truckId: truck.id,
      customerId: customer.id,
      origin: `${testPrefix}フロー発地A`,
      destination: `${testPrefix}フロー着地A`,
      fare: 30000,
      tollFee: 1500,
    });
    cleanup.track("report", report1.id);

    const report2 = await api.createReport({
      reportDate: dateStr,
      employeeId: employee.id,
      truckId: truck.id,
      customerId: customer.id,
      origin: `${testPrefix}フロー発地B`,
      destination: `${testPrefix}フロー着地B`,
      fare: 20000,
    });
    cleanup.track("report", report2.id);

    // Step 1: Go to reports page
    await page.goto("/reports");
    await expect(page.getByText("日報一覧")).toBeVisible();

    // Wait for our reports to load
    await expect(
      page.getByText(`${testPrefix}フロー発地A`)
    ).toBeVisible({ timeout: 10000 });

    // Step 2: Select both reports using checkboxes
    const row1 = page.locator("tr", {
      hasText: `${testPrefix}フロー発地A`,
    });
    await row1.locator("button[role='checkbox']").click();

    const row2 = page.locator("tr", {
      hasText: `${testPrefix}フロー発地B`,
    });
    await row2.locator("button[role='checkbox']").click();

    // Footer should show 2 selected
    await expect(page.getByText("2件")).toBeVisible();

    // Step 3: Click "請求書作成"
    await page.getByRole("button", { name: "請求書作成" }).click();

    // Should navigate to invoice creation with reportIds
    await expect(page).toHaveURL(/\/invoices\/new\?reportIds=/, {
      timeout: 5000,
    });

    // Step 4: Verify pre-selected data
    await expect(page.getByText("請求書作成")).toBeVisible();

    // Customer should be pre-filled
    await expect(page.getByText(`${testPrefix}フロー得意先`)).toBeVisible();

    // Both reports should be checked
    await expect(page.getByText(`${testPrefix}フロー発地A`)).toBeVisible();
    await expect(page.getByText(`${testPrefix}フロー発地B`)).toBeVisible();

    // Step 5: Submit the invoice
    await page.getByRole("button", { name: "請求書を作成" }).click();
    await expect(page).toHaveURL("/invoices", { timeout: 15000 });

    // Step 6: Find the created invoice and verify
    const invoiceRow = page.locator("tr", {
      hasText: `${testPrefix}フロー得意先`,
    });
    await expect(invoiceRow).toBeVisible();

    // Click to view detail
    await invoiceRow.getByRole("link").first().click();

    // Verify amounts on detail page
    await expect(page.getByText("請求明細書")).toBeVisible();
    await expect(
      page.getByText(`${testPrefix}フロー得意先`)
    ).toBeVisible();

    // Verify calculated amounts on the summary table
    // fare: 30000 + 20000 = subtotal 50000
    // tax: 50000 * 0.1 = 5000
    // total: 50000 + 5000 = 55000
    // tollFee: 1500 (tax-included), displayed tax-excluded = Math.round(1500/1.1) = 1364
    const summaryTable = page.locator("table").filter({ hasText: "当月売上額" });
    await expect(summaryTable.locator("td").filter({ hasText: "¥50,000" }).first()).toBeVisible();
    await expect(summaryTable.locator("td").filter({ hasText: "¥5,000" })).toBeVisible();
    await expect(summaryTable.locator("td").filter({ hasText: "¥55,000" })).toBeVisible();

    // Verify the tax summary table at the bottom
    const taxSummary = page.locator("table").filter({ hasText: "【 合　計 】" });
    await expect(taxSummary.locator("td").filter({ hasText: "¥50,000" }).first()).toBeVisible();
    await expect(taxSummary.locator("td").filter({ hasText: "¥55,000" })).toBeVisible();

    // Clean up invoice (find its ID from URL)
    const url = page.url();
    const invoiceId = url.match(/invoices\/(\d+)/)?.[1];
    if (invoiceId) {
      cleanup.track("invoice", parseInt(invoiceId));
    }
  });
});
