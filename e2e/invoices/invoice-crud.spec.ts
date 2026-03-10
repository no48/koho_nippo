import { test, expect } from "../fixtures/test-data.fixture";

test.describe("請求書CRUD", () => {
  test("一覧ページが表示される", async ({ page }) => {
    await page.goto("/invoices");
    await expect(page.getByText("請求書一覧")).toBeVisible();
    await expect(page.getByText("請求書を管理します")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "新規作成" })
    ).toBeVisible();
  });

  test("手動明細のみで請求書を作成できる", async ({
    page,
    api,
    cleanup,
    testPrefix,
  }) => {
    // Create customer for the invoice
    const customer = await api.createCustomer({
      name: `${testPrefix}請求書テスト得意先`,
    });
    cleanup.track("customer", customer.id);

    await page.goto("/invoices/new");
    await expect(page.getByText("請求書作成")).toBeVisible();

    // Fill issue date
    const today = new Date().toISOString().split("T")[0];
    await page.getByLabel("発行日").fill(today);

    // Select customer via autocomplete
    const customerInput = page.locator("#customerId");
    await customerInput.fill(`${testPrefix}請求書テスト`);
    await page.getByText(`${testPrefix}請求書テスト得意先`).click();

    // Wait for manual items section to appear
    await expect(page.getByText("手動明細入力")).toBeVisible();

    // Add a manual item
    await page.getByRole("button", { name: "明細を追加" }).click();

    // Fill manual item fields
    await page.getByLabel("説明（発着地、品名など）").fill(
      `${testPrefix}埼玉 → 茨城 段ボール`
    );

    // Fill amount (inside the ¥ prefix input)
    const amountInput = page
      .locator("div")
      .filter({ hasText: "金額（税抜）" })
      .locator("input[type='number']");
    await amountInput.fill("50000");

    // Verify the amounts card appears
    await expect(page.getByText("小計（税抜）")).toBeVisible();
    await expect(page.getByText("合計")).toBeVisible();

    // Submit
    await page.getByRole("button", { name: "請求書を作成" }).click();

    // Should redirect to invoices list
    await expect(page).toHaveURL("/invoices", { timeout: 15000 });

    // Find and clean up the created invoice
    const row = page.locator("tr", {
      hasText: `${testPrefix}請求書テスト得意先`,
    });
    await expect(row).toBeVisible();

    // Delete it (draft status, so delete button should be available)
    await row.getByRole("button").filter({ has: page.locator("svg") }).last().click();
    await expect(page.getByText("請求書を削除しますか？")).toBeVisible();
    await page.getByRole("button", { name: "削除" }).click();
  });

  test("請求書詳細ページを表示できる", async ({ page, api, cleanup, testPrefix }) => {
    const customer = await api.createCustomer({
      name: `${testPrefix}詳細テスト得意先`,
    });
    cleanup.track("customer", customer.id);

    const invoice = await api.createInvoice({
      customerId: customer.id,
      issueDate: new Date().toISOString().split("T")[0],
      items: [
        {
          itemDate: new Date().toISOString().split("T")[0],
          description: `${testPrefix}テスト明細`,
          amount: 40000,
        },
      ],
    });
    cleanup.track("invoice", invoice.id);

    await page.goto(`/invoices/${invoice.id}`);

    // Check header
    await expect(page.getByText("請求書詳細")).toBeVisible();
    await expect(page.getByText("請求明細書")).toBeVisible();

    // Check customer name appears
    await expect(page.getByText(`${testPrefix}詳細テスト得意先`)).toBeVisible();

    // Check draft badge
    await expect(page.getByText("下書き")).toBeVisible();

    // Check action buttons (draft mode)
    await expect(page.getByRole("link", { name: "編集" })).toBeVisible();
    await expect(page.getByRole("button", { name: "発行" })).toBeVisible();
    await expect(page.getByRole("button", { name: "印刷" })).toBeVisible();
    await expect(page.getByRole("button", { name: "PDF" })).toBeVisible();
  });

  test("下書き請求書を発行できる", async ({ page, api, cleanup, testPrefix }) => {
    const customer = await api.createCustomer({
      name: `${testPrefix}発行テスト得意先`,
    });
    cleanup.track("customer", customer.id);

    const invoice = await api.createInvoice({
      customerId: customer.id,
      issueDate: new Date().toISOString().split("T")[0],
      items: [
        {
          itemDate: new Date().toISOString().split("T")[0],
          description: `${testPrefix}発行テスト明細`,
          amount: 35000,
        },
      ],
    });
    cleanup.track("invoice", invoice.id);

    await page.goto(`/invoices/${invoice.id}`);

    // Click issue button
    await page.getByRole("button", { name: "発行" }).click();

    // Badge should change to issued
    await expect(page.getByText("発行済")).toBeVisible({ timeout: 5000 });

    // Edit button should no longer be visible
    await expect(page.getByRole("link", { name: "編集" })).not.toBeVisible();
  });
});
