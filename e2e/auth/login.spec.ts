import { test, expect } from "@playwright/test";

// Login tests do NOT use storageState — they test the login flow itself
test.use({ storageState: { cookies: [], origins: [] } });

test.describe("ログイン", () => {
  test("正しい認証情報でログインできる", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByText("運送管理システム")).toBeVisible();

    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL("/", { timeout: 15000 });
    await expect(page.getByText("ダッシュボード")).toBeVisible();
  });

  test("誤ったパスワードでログイン失敗", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("wrongpassword");
    await page.getByRole("button", { name: "ログイン" }).click();

    // Should stay on login page and show error toast
    await expect(page).toHaveURL(/\/login/);
    // The sonner toast should appear with error text
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5000,
    });
  });

  test("存在しないメールアドレスでログイン失敗", async ({ page }) => {
    await page.goto("/login");

    await page.getByLabel("メールアドレス").fill("nobody@example.com");
    await page.getByLabel("パスワード").fill("password123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/login/);
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5000,
    });
  });

  test("未認証ユーザーはダッシュボードからログインへリダイレクト", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/login/);
  });

  test("未認証ユーザーは日報ページからログインへリダイレクト", async ({
    page,
  }) => {
    await page.goto("/reports");
    await expect(page).toHaveURL(/\/login/);
  });

  test("未認証ユーザーは請求書ページからログインへリダイレクト", async ({
    page,
  }) => {
    await page.goto("/invoices");
    await expect(page).toHaveURL(/\/login/);
  });
});
