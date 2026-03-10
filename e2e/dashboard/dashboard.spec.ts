import { test, expect } from "../fixtures/test-data.fixture";

test.describe("ダッシュボード", () => {
  test("ダッシュボードが正しく表示される", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("ダッシュボード")).toBeVisible();
    await expect(
      page.getByText("運送業基幹システムへようこそ")
    ).toBeVisible();
  });

  test("統計カードが表示される", async ({ page }) => {
    await page.goto("/");

    // Wait for stats to load
    await expect(page.getByText("トラック")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("従業員")).toBeVisible();
    await expect(page.getByText("得意先")).toBeVisible();
    await expect(page.getByText("今月の日報")).toBeVisible();

    // Check the stat labels
    await expect(page.getByText("登録台数")).toBeVisible();
    await expect(page.getByText("登録人数")).toBeVisible();
    await expect(page.getByText(/登録件数/).first()).toBeVisible();
  });

  test("クイックアクションリンクが機能する", async ({ page }) => {
    await page.goto("/");

    // Check quick action links
    await expect(
      page.getByRole("link", { name: /日報を登録する/ })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /請求書を作成する/ })
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: /給料明細を作成する/ })
    ).toBeVisible();

    // Click "日報を登録する" and verify navigation
    await page.getByRole("link", { name: /日報を登録する/ }).click();
    await expect(page).toHaveURL("/reports/new");
  });

  test("統計カードのリンクが正しく遷移する", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("登録台数")).toBeVisible({ timeout: 10000 });

    // Click on truck stat card
    await page.getByText("トラック").click();
    await expect(page).toHaveURL("/trucks");
  });

  test("最近の日報セクションが表示される", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByText("最近の日報")).toBeVisible({ timeout: 10000 });
    await expect(page.getByText("直近の配送記録")).toBeVisible();
  });
});
