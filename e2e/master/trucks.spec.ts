import { test, expect } from "../fixtures/test-data.fixture";

test.describe("トラックマスタ", () => {
  test("一覧ページが表示される", async ({ page }) => {
    await page.goto("/trucks");
    await expect(page.getByText("トラック一覧")).toBeVisible();
    await expect(page.getByText("社内トラックを管理します")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "新規登録" })
    ).toBeVisible();
  });

  test("新規トラックを登録・一覧表示・削除できる", async ({
    page,
    cleanup,
    testPrefix,
  }) => {
    const vehicleNumber = `${testPrefix}埼玉 999 て 9999`;
    const vehicleName = `${testPrefix}テスト4tウイング`;

    // Navigate to new truck form
    await page.goto("/trucks/new");
    await expect(page.getByText("基本情報")).toBeVisible();

    // Fill the form
    await page.getByLabel("車両番号").fill(vehicleNumber);
    await page.getByLabel("車種名").fill(vehicleName);
    await page.getByLabel("メモ").fill("E2Eテスト用トラック");

    // Submit
    await page.getByRole("button", { name: "登録" }).click();

    // Should redirect to trucks list
    await expect(page).toHaveURL("/trucks", { timeout: 10000 });

    // Verify the truck appears in the list
    await expect(page.getByText(vehicleNumber)).toBeVisible();
    await expect(page.getByText(vehicleName)).toBeVisible();

    // Find the row and track for cleanup
    const row = page.locator("tr", { hasText: vehicleNumber });

    // Delete via UI
    await row.getByRole("button").filter({ has: page.locator("svg") }).last().click();

    // Confirm delete dialog
    await expect(
      page.getByText("トラックを削除しますか？")
    ).toBeVisible();
    await page.getByRole("button", { name: "削除" }).click();

    // Verify deleted
    await expect(page.getByText(vehicleNumber)).not.toBeVisible();
  });

  test("トラックを編集できる", async ({ page, api, cleanup, testPrefix }) => {
    // Create via API
    const truck = await api.createTruck({
      vehicleNumber: `${testPrefix}埼玉 888 て 8888`,
      vehicleName: `${testPrefix}テスト10t`,
    });
    cleanup.track("truck", truck.id);

    await page.goto("/trucks");

    // Find the row and click edit
    const row = page.locator("tr", {
      hasText: `${testPrefix}埼玉 888 て 8888`,
    });
    await row.getByRole("link").first().click();

    // Should be on edit page
    await expect(page).toHaveURL(new RegExp(`/trucks/${truck.id}/edit`));

    // Update the vehicle name
    const nameInput = page.getByLabel("車種名");
    await nameInput.clear();
    await nameInput.fill(`${testPrefix}テスト10t更新済`);

    await page.getByRole("button", { name: "更新" }).click();

    // Should redirect to trucks list
    await expect(page).toHaveURL("/trucks", { timeout: 10000 });

    // Verify updated
    await expect(page.getByText(`${testPrefix}テスト10t更新済`)).toBeVisible();
  });
});
