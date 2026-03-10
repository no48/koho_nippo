import { test, expect } from "../fixtures/test-data.fixture";

test.describe("設定ページ", () => {
  test("設定ページが表示される", async ({ page }) => {
    await page.goto("/settings");
    await expect(page.getByText("設定")).first().toBeVisible();
    await expect(
      page.getByText("会社情報や請求書に表示される内容を設定します")
    ).toBeVisible();
  });

  test("会社情報セクションが表示される", async ({ page }) => {
    await page.goto("/settings");

    // Check company info fields
    await expect(page.getByText("会社情報")).first().toBeVisible();
    await expect(page.getByLabel("会社名")).toBeVisible();
    await expect(page.getByLabel("郵便番号")).toBeVisible();
    await expect(page.getByLabel("住所")).toBeVisible();
    await expect(page.getByLabel("電話番号")).toBeVisible();
    await expect(page.getByLabel("FAX番号")).toBeVisible();
  });

  test("振込先口座セクションが表示される", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText("振込先口座")).first().toBeVisible();
    await expect(page.getByLabel("銀行名")).toBeVisible();
    await expect(page.getByLabel("支店名")).toBeVisible();
    await expect(page.getByLabel("口座番号")).toBeVisible();
  });

  test("インボイス制度セクションが表示される", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText("インボイス制度")).first().toBeVisible();
    await expect(page.getByLabel("登録番号")).toBeVisible();
  });

  test("単価マスタのタブが表示される", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText("単価マスタ")).first().toBeVisible();

    // Check wage type tabs
    await expect(page.getByRole("tab", { name: "大型" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "常用" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "4t" })).toBeVisible();
  });

  test("設定を保存できる", async ({ page }) => {
    await page.goto("/settings");

    // Get current company name and modify slightly
    const companyNameInput = page.getByLabel("会社名");
    await expect(companyNameInput).toBeVisible({ timeout: 10000 });

    const currentValue = await companyNameInput.inputValue();

    // Save without changing (just verify the button works)
    await page.getByRole("button", { name: "設定を保存" }).click();

    // Should show success toast
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5000,
    });
  });

  test("ユーザー管理リンクが表示される", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText("システム設定")).first().toBeVisible();
    await expect(
      page.getByRole("link", { name: /ユーザー管理/ })
    ).toBeVisible();
  });

  test("日報種類セクションが表示される", async ({ page }) => {
    await page.goto("/settings");

    await expect(page.getByText("日報種類")).first().toBeVisible();
  });
});
