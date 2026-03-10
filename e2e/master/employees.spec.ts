import { test, expect } from "../fixtures/test-data.fixture";

test.describe("従業員マスタ", () => {
  test("一覧ページが表示される", async ({ page }) => {
    await page.goto("/employees");
    await expect(page.getByText("従業員一覧")).toBeVisible();
    await expect(page.getByText("従業員を管理します")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "新規登録" })
    ).toBeVisible();
  });

  test("新規従業員を登録・一覧表示・削除できる", async ({
    page,
    cleanup,
    testPrefix,
  }) => {
    const name = `${testPrefix}テスト太郎`;
    const nameKana = `${testPrefix}テストタロウ`;

    // Navigate to new employee form
    await page.goto("/employees/new");
    await expect(page.getByText("基本情報")).toBeVisible();

    // Fill required fields
    await page.getByLabel("氏名").fill(name);
    await page.getByLabel("フリガナ").fill(nameKana);

    // Fill optional fields
    await page.getByLabel("電話番号").fill("090-0000-0000");

    // Submit
    await page.getByRole("button", { name: "登録" }).click();

    // Should redirect to employees list
    await expect(page).toHaveURL("/employees", { timeout: 10000 });

    // Verify the employee appears in the list
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(nameKana)).toBeVisible();

    // Delete via UI
    const row = page.locator("tr", { hasText: name });
    await row.getByRole("button").filter({ has: page.locator("svg") }).last().click();

    // Confirm delete
    await expect(
      page.getByText("従業員を削除しますか？")
    ).toBeVisible();
    await page.getByRole("button", { name: "削除" }).click();

    // Verify deleted
    await expect(page.getByText(name)).not.toBeVisible();
  });

  test("従業員を編集できる", async ({ page, api, cleanup, testPrefix }) => {
    // Create via API
    const emp = await api.createEmployee({
      name: `${testPrefix}編集用太郎`,
      nameKana: `${testPrefix}ヘンシュウヨウタロウ`,
      phone: "090-1111-1111",
    });
    cleanup.track("employee", emp.id);

    await page.goto("/employees");

    // Click edit on the row
    const row = page.locator("tr", { hasText: `${testPrefix}編集用太郎` });
    await row.getByRole("link").first().click();

    // Update phone
    const phoneInput = page.getByLabel("電話番号");
    await phoneInput.clear();
    await phoneInput.fill("090-2222-2222");

    await page.getByRole("button", { name: "更新" }).click();

    // Should redirect to list
    await expect(page).toHaveURL("/employees", { timeout: 10000 });

    // Verify updated phone shows in list
    await expect(page.getByText("090-2222-2222")).toBeVisible();
  });
});
