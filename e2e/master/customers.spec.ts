import { test, expect } from "../fixtures/test-data.fixture";

test.describe("得意先マスタ", () => {
  test("一覧ページが表示される", async ({ page }) => {
    await page.goto("/customers");
    await expect(page.getByText("得意先一覧")).toBeVisible();
    await expect(page.getByText("得意先を管理します")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "新規登録" })
    ).toBeVisible();
  });

  test("新規得意先を登録・一覧表示・削除できる", async ({
    page,
    cleanup,
    testPrefix,
  }) => {
    const customerName = `${testPrefix}株式会社テスト商事`;

    // Navigate to new customer form
    await page.goto("/customers/new");
    await expect(page.getByText("基本情報")).toBeVisible();

    // Fill form
    await page.getByLabel("得意先名").fill(customerName);
    await page.getByLabel("住所").fill("テスト県テスト市1-2-3");
    await page.getByLabel("電話番号").fill("03-0000-0000");
    await page.getByLabel("担当者").fill("テスト担当");

    // Submit
    await page.getByRole("button", { name: "登録" }).click();

    // Should redirect to customers list
    await expect(page).toHaveURL("/customers", { timeout: 10000 });

    // Verify in list
    await expect(page.getByText(customerName)).toBeVisible();

    // Delete via UI
    const row = page.locator("tr", { hasText: customerName });
    await row.getByRole("button").filter({ has: page.locator("svg") }).last().click();

    // Confirm delete
    await expect(
      page.getByText("得意先を削除しますか？")
    ).toBeVisible();
    await page.getByRole("button", { name: "削除" }).click();

    // Verify deleted
    await expect(page.getByText(customerName)).not.toBeVisible();
  });

  test("得意先を編集できる", async ({ page, api, cleanup, testPrefix }) => {
    // Create via API
    const customer = await api.createCustomer({
      name: `${testPrefix}編集用株式会社`,
      address: "旧住所",
      phone: "03-1111-1111",
    });
    cleanup.track("customer", customer.id);

    await page.goto("/customers");

    // Click edit
    const row = page.locator("tr", { hasText: `${testPrefix}編集用株式会社` });
    await row.getByRole("link").first().click();

    // Update address
    const addressInput = page.getByLabel("住所");
    await addressInput.clear();
    await addressInput.fill("新住所県新住所市9-8-7");

    await page.getByRole("button", { name: "更新" }).click();

    // Should redirect to list
    await expect(page).toHaveURL("/customers", { timeout: 10000 });

    // Verify updated
    await expect(page.getByText("新住所県新住所市9-8-7")).toBeVisible();
  });
});
