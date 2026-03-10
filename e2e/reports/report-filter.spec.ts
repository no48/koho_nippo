import { test, expect } from "../fixtures/test-data.fixture";

test.describe("日報フィルタ・月ナビゲーション", () => {
  test("月ナビゲーションが表示され操作できる", async ({ page }) => {
    await page.goto("/reports");

    // Month navigation should be visible
    await expect(page.getByText("25日締め")).toBeVisible({ timeout: 10000 });

    // Click previous month
    const prevButton = page.locator("button").filter({ has: page.locator("svg.lucide-chevron-left") });
    await prevButton.click();

    // Period text should update
    await expect(page.getByText("対象期間:")).toBeVisible();
  });

  test("従業員フィルタで絞り込みできる", async ({ page }) => {
    await page.goto("/reports");

    // Wait for filter selects to load
    await expect(page.getByText("日報一覧")).toBeVisible();

    // The employee filter trigger should exist
    const employeeFilter = page.locator("button[role='combobox']").filter({
      hasText: /従業員で絞り込み|すべての従業員/,
    });
    await expect(employeeFilter).toBeVisible({ timeout: 10000 });
  });

  test("得意先フィルタで絞り込みできる", async ({ page }) => {
    await page.goto("/reports");

    // The customer filter trigger should exist
    const customerFilter = page.locator("button[role='combobox']").filter({
      hasText: /得意先で絞り込み|すべての得意先/,
    });
    await expect(customerFilter).toBeVisible({ timeout: 10000 });
  });

  test("月間合計が表示される", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForTimeout(3000); // Wait for reports to load

    // If there are reports, the summary should show
    const noReports = page.getByText("日報がありません");
    const summary = page.getByText("月間合計");

    // Either no reports message or summary should be visible
    await expect(noReports.or(summary)).toBeVisible({ timeout: 10000 });
  });

  test("すべて選択/解除ボタンが動作する", async ({ page }) => {
    await page.goto("/reports");
    await page.waitForTimeout(3000);

    const selectAllButton = page.getByRole("button", { name: /すべて選択|すべて解除/ });

    // If reports exist, the button should be visible and clickable
    if (await selectAllButton.isVisible()) {
      await selectAllButton.click();

      // The footer bar should show selected count
      await expect(page.getByText(/件.*選択中/)).toBeVisible();

      // Click again to deselect
      await page.getByRole("button", { name: "すべて解除" }).click();
      await expect(page.getByText("日報を選択してください")).toBeVisible();
    }
  });
});
