import { test, expect } from "../fixtures/test-data.fixture";

test.describe("給料明細CRUD", () => {
  test("一覧ページが表示される", async ({ page }) => {
    await page.goto("/payrolls");
    await expect(page.getByText("給料明細一覧")).toBeVisible();
    await expect(page.getByText("給料明細を管理します")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "新規作成" })
    ).toBeVisible();
  });

  test("給料明細を作成できる", async ({ page, api, cleanup, testPrefix }) => {
    const employee = await api.createEmployee({
      name: `${testPrefix}給料太郎`,
      nameKana: `${testPrefix}キュウリョウタロウ`,
      baseSalary: 250000,
    });
    cleanup.track("employee", employee.id);

    await page.goto("/payrolls/new");
    await expect(page.getByText("給料明細作成")).toBeVisible();

    // Select employee
    const employeeSelect = page.locator("button[role='combobox']").filter({
      hasText: /従業員を選択/,
    });
    await employeeSelect.click();
    await page
      .getByRole("option", { name: new RegExp(`${testPrefix}給料太郎`) })
      .click();

    // Select year-month
    const yearMonthSelect = page.locator("button[role='combobox']").filter({
      hasText: /対象月を選択/,
    });
    await yearMonthSelect.click();
    // Pick the first available month
    await page.getByRole("option").first().click();

    // Wait for salary summary to appear
    await expect(page.getByText("支給額")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("基本給")).toBeVisible();

    // Submit
    await page.getByRole("button", { name: "給料明細を作成" }).click();

    // Should redirect to payrolls list
    await expect(page).toHaveURL("/payrolls", { timeout: 15000 });

    // Verify the payroll appears in the list
    await expect(
      page.getByText(`${testPrefix}給料太郎`)
    ).toBeVisible();

    // Find and delete
    const row = page.locator("tr", {
      hasText: `${testPrefix}給料太郎`,
    });
    await row.getByRole("button").filter({ has: page.locator("svg") }).last().click();
    await expect(page.getByText("給料明細を削除しますか？")).toBeVisible();
    await page.getByRole("button", { name: "削除" }).click();

    await expect(
      page.getByText(`${testPrefix}給料太郎`)
    ).not.toBeVisible();
  });

  test("給料明細詳細ページを表示できる", async ({
    page,
    api,
    cleanup,
    testPrefix,
  }) => {
    const employee = await api.createEmployee({
      name: `${testPrefix}詳細給料太郎`,
      nameKana: `${testPrefix}ショウサイキュウリョウタロウ`,
      baseSalary: 300000,
    });
    cleanup.track("employee", employee.id);

    // Determine a valid yearMonth (handle December → January rollover)
    const now = new Date();
    let ymYear = now.getFullYear();
    let ymMonth = now.getMonth() + 1; // 1-based
    if (now.getDate() >= 26) {
      ymMonth += 1;
      if (ymMonth > 12) {
        ymMonth = 1;
        ymYear += 1;
      }
    }
    const ym = `${ymYear}-${String(ymMonth).padStart(2, "0")}`;

    const payroll = await api.createPayroll({
      employeeId: employee.id,
      yearMonth: ym,
      baseSalary: 300000,
    });
    cleanup.track("payroll", payroll.id);

    await page.goto(`/payrolls/${payroll.id}`);
    await expect(page.getByText("給料明細詳細")).toBeVisible();
    await expect(page.getByText("給料明細書")).toBeVisible();
    await expect(
      page.getByText(`${testPrefix}詳細給料太郎`)
    ).toBeVisible();

    // Verify key sections
    await expect(page.getByText("差引支給額")).toBeVisible();
    await expect(page.getByText("基本給")).toBeVisible();

    // Verify print button
    await expect(page.getByRole("button", { name: "印刷 / PDF" })).toBeVisible();
  });
});
