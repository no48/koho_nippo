import { test, expect } from "../fixtures/test-data.fixture";

test.describe("チェックリスト", () => {
  test("チェックリストページが表示される", async ({ page }) => {
    await page.goto("/checklist");
    await expect(page.getByText("確認事項")).toBeVisible();
    await expect(page.getByText("やるべきことを管理します")).toBeVisible();
    await expect(page.getByText("新規追加")).toBeVisible();
  });

  test("チェックリスト項目を追加・完了・削除できる", async ({
    page,
    testPrefix,
  }) => {
    const title = `${testPrefix}テストタスク`;

    await page.goto("/checklist");
    await expect(page.getByText("新規追加")).toBeVisible();

    // Add a new item
    await page.getByPlaceholder("確認事項を入力...").fill(title);
    await page.getByRole("button", { name: "追加" }).click();

    // Should appear in pending list
    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("未完了")).toBeVisible();

    // Toggle completion (click checkbox)
    const itemRow = page.locator("div", { hasText: title }).filter({
      has: page.locator("button[role='checkbox']"),
    });
    await itemRow.locator("button[role='checkbox']").click();

    // Should move to completed section
    await expect(page.getByText("完了済み")).toBeVisible({ timeout: 5000 });

    // Delete the item
    const completedSection = page.locator("div", { hasText: "完了済み" });
    const deleteButton = completedSection
      .locator("div", { hasText: title })
      .getByRole("button")
      .filter({ has: page.locator("svg") });
    await deleteButton.click();

    // Should be removed
    await expect(page.getByText(title)).not.toBeVisible({ timeout: 5000 });
  });

  test("優先度付きでチェックリスト項目を追加できる", async ({
    page,
    testPrefix,
  }) => {
    const title = `${testPrefix}高優先テスト`;

    await page.goto("/checklist");

    // Fill title
    await page.getByPlaceholder("確認事項を入力...").fill(title);

    // Select priority "高"
    const prioritySelect = page.locator("button[role='combobox']").filter({
      hasText: /中|高|低/,
    });
    await prioritySelect.click();
    await page.getByRole("option", { name: "高" }).click();

    // Add
    await page.getByRole("button", { name: "追加" }).click();

    // Verify it appears with high priority badge
    await expect(page.getByText(title)).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("高").first()).toBeVisible();

    // Clean up: delete it
    const itemRow = page.locator("div").filter({ hasText: title });
    await itemRow
      .getByRole("button")
      .filter({ has: page.locator("svg.lucide-trash-2") })
      .click();
  });
});
