import { test as setup, expect } from "@playwright/test";

setup("authenticate", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("メールアドレス").fill("admin@example.com");
  await page.getByLabel("パスワード").fill("password123");
  await page.getByRole("button", { name: "ログイン" }).click();

  // Wait for redirect to dashboard
  await expect(page).toHaveURL("/", { timeout: 15000 });
  await expect(page.getByText("ダッシュボード")).toBeVisible();

  await page.context().storageState({ path: ".auth/user.json" });
});
