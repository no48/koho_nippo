import { test, expect } from "../fixtures/test-data.fixture";

test.describe("日報CRUD", () => {
  test("一覧ページが表示される", async ({ page }) => {
    await page.goto("/reports");
    await expect(page.getByText("日報一覧")).toBeVisible();
    await expect(page.getByText("日報を管理します")).toBeVisible();
    await expect(page.getByRole("link", { name: "新規登録" })).toBeVisible();
  });

  test("日報を作成できる", async ({ page, api, cleanup, testPrefix }) => {
    // Create master data for the form
    const truck = await api.createTruck({
      vehicleNumber: `${testPrefix}日報用トラック 111 あ 1111`,
      vehicleName: `${testPrefix}日報用4t`,
    });
    cleanup.track("truck", truck.id);

    const employee = await api.createEmployee({
      name: `${testPrefix}日報用太郎`,
      nameKana: `${testPrefix}ニッポウヨウタロウ`,
    });
    cleanup.track("employee", employee.id);

    const customer = await api.createCustomer({
      name: `${testPrefix}日報用株式会社`,
    });
    cleanup.track("customer", customer.id);

    await page.goto("/reports/new");
    await expect(page.getByText("基本情報")).toBeVisible();

    // Fill date
    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(Math.min(today.getDate(), 25)).padStart(2, "0")}`;
    await page.getByLabel("日付").fill(dateStr);

    // Select customer via autocomplete — type the name and pick from dropdown
    const customerInput = page.locator("#customerId");
    await customerInput.fill(`${testPrefix}日報用`);
    await page.getByText(`${testPrefix}日報用株式会社`).click();

    // Select employee from dropdown (use placeholder text for reliable targeting)
    await page.locator("button[role='combobox']").filter({ hasText: "従業員を選択" }).click();
    await page.getByRole("option", { name: `${testPrefix}日報用太郎` }).click();

    // Select truck
    await page.locator("button[role='combobox']").filter({ hasText: "トラックを選択" }).click();
    await page.getByRole("option", { name: new RegExp(`${testPrefix}日報用トラック`) }).click();

    // Fill origin and destination
    await page.locator("#origin").fill(`${testPrefix}埼玉県テスト市`);
    await page.locator("#destination").fill(`${testPrefix}茨城県テスト市`);

    // Fill fare
    await page.locator("#fare").fill("30000");

    // Submit
    await page.getByRole("button", { name: "登録" }).click();

    // Should redirect to reports list
    await expect(page).toHaveURL("/reports", { timeout: 15000 });
  });

  test("日報をAPI経由で作成し一覧に表示・削除できる", async ({
    page,
    api,
    cleanup,
    testPrefix,
  }) => {
    const truck = await api.createTruck({
      vehicleNumber: `${testPrefix}API日報トラック 222 い 2222`,
      vehicleName: `${testPrefix}API日報4t`,
    });
    cleanup.track("truck", truck.id);

    const employee = await api.createEmployee({
      name: `${testPrefix}API日報太郎`,
      nameKana: `${testPrefix}エーピーアイニッポウタロウ`,
    });
    cleanup.track("employee", employee.id);

    const customer = await api.createCustomer({
      name: `${testPrefix}API日報株式会社`,
    });
    cleanup.track("customer", customer.id);

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(Math.min(today.getDate(), 25)).padStart(2, "0")}`;

    const report = await api.createReport({
      reportDate: dateStr,
      employeeId: employee.id,
      truckId: truck.id,
      customerId: customer.id,
      origin: `${testPrefix}API発地`,
      destination: `${testPrefix}API着地`,
      fare: 25000,
    });
    cleanup.track("report", report.id);

    await page.goto("/reports");

    // Wait for the report to appear
    await expect(page.getByText(`${testPrefix}API発地`)).toBeVisible({
      timeout: 10000,
    });

    // Delete it
    const row = page.locator("tr", { hasText: `${testPrefix}API発地` });
    await row.getByRole("button").filter({ has: page.locator("svg") }).last().click();

    await expect(page.getByText("日報を削除しますか？")).toBeVisible();
    await page.getByRole("button", { name: "削除" }).click();

    await expect(page.getByText(`${testPrefix}API発地`)).not.toBeVisible();
  });
});
