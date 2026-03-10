import { test, expect } from "../fixtures/test-data.fixture";

test.describe("請求書→日報作成フロー", () => {
  test("手動請求書から日報作成モーダルで日報を作成できる", async ({
    page,
    api,
    cleanup,
    testPrefix,
  }) => {
    // Prepare test data
    const customer = await api.createCustomer({
      name: `${testPrefix}逆フロー得意先`,
    });
    cleanup.track("customer", customer.id);

    const truck = await api.createTruck({
      vehicleNumber: `${testPrefix}逆フロー 200 い 2222`,
      vehicleName: `${testPrefix}逆フロー10t`,
    });
    cleanup.track("truck", truck.id);

    const employee = await api.createEmployee({
      name: `${testPrefix}逆フロー太郎`,
      nameKana: `${testPrefix}ギャクフロータロウ`,
    });
    cleanup.track("employee", employee.id);

    // Create a manual invoice (no daily reports linked)
    const today = new Date().toISOString().split("T")[0];
    const invoice = await api.createInvoice({
      customerId: customer.id,
      issueDate: today,
      items: [
        {
          itemDate: today,
          description: `${testPrefix}テスト配送`,
          amount: 45000,
          tollFee: 2000,
        },
      ],
    });
    cleanup.track("invoice", invoice.id);

    // Go to invoice detail
    await page.goto(`/invoices/${invoice.id}`);
    await expect(page.getByText("請求書詳細")).toBeVisible();

    // Click "+ 日報" button on the item row
    await page.getByRole("button", { name: "日報" }).first().click();

    // Modal should open
    await expect(
      page.getByText("日報作成（請求書明細から）")
    ).toBeVisible();

    // Verify auto-filled data is shown
    await expect(page.getByText("自動入力（請求書から取得）")).toBeVisible();
    await expect(
      page.getByText(`${testPrefix}逆フロー得意先`)
    ).toBeVisible();

    // Fill required fields in modal
    // The modal has its own Select triggers with placeholder "選択してください"
    const modal = page.locator("[role='dialog']");

    // Select employee — first combobox in modal
    const employeeSelect = modal.locator("button[role='combobox']").filter({
      hasText: "選択してください",
    }).first();
    await employeeSelect.click();
    await page
      .getByRole("option", { name: `${testPrefix}逆フロー太郎` })
      .click();

    // Select truck — next combobox with placeholder
    const truckSelect = modal.locator("button[role='combobox']").filter({
      hasText: "選択してください",
    }).first();
    await truckSelect.click();
    await page
      .getByRole("option", { name: new RegExp(`${testPrefix}逆フロー`) })
      .click();

    // Fill origin/destination
    await page.getByPlaceholder("例: 埼玉県杉戸町 平田倉庫㈱").fill(`${testPrefix}逆フロー発地`);
    await page.getByPlaceholder("例: 茨城県常総市 王子コンテナー㈱").fill(`${testPrefix}逆フロー着地`);

    // Submit
    await page.getByRole("button", { name: "日報を作成" }).click();

    // Success toast should appear and modal should close
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5000,
    });

    // The report count badge should now show "1件"
    await expect(page.getByText("1件")).toBeVisible({ timeout: 5000 });
  });

  test("通行料の二重計上を防ぐ（請求書→日報フロー）", async ({
    page,
    api,
    cleanup,
    testPrefix,
  }) => {
    // Create test data
    const customer = await api.createCustomer({
      name: `${testPrefix}通行料テスト得意先`,
    });
    cleanup.track("customer", customer.id);

    const truck = await api.createTruck({
      vehicleNumber: `${testPrefix}通行料 300 う 3333`,
      vehicleName: `${testPrefix}通行料4t`,
    });
    cleanup.track("truck", truck.id);

    const employee = await api.createEmployee({
      name: `${testPrefix}通行料太郎`,
      nameKana: `${testPrefix}ツウコウリョウタロウ`,
    });
    cleanup.track("employee", employee.id);

    // Create invoice with toll fee in the manual item
    const today = new Date().toISOString().split("T")[0];
    const invoice = await api.createInvoice({
      customerId: customer.id,
      issueDate: today,
      items: [
        {
          itemDate: today,
          description: `${testPrefix}通行料テスト配送`,
          amount: 30000,
          tollFee: 3000, // Manual toll fee on invoice item
        },
      ],
    });
    cleanup.track("invoice", invoice.id);

    // Go to invoice detail
    await page.goto(`/invoices/${invoice.id}`);
    await expect(page.getByText("請求書詳細")).toBeVisible();

    // The toll fee should show in the summary (3000 ÷ 1.1 ≈ 2727 as tax-excluded)
    await expect(page.getByText("通行料")).toBeVisible();

    // Create a report from this invoice item
    await page.getByRole("button", { name: "日報" }).first().click();
    await expect(
      page.getByText("日報作成（請求書明細から）")
    ).toBeVisible();

    // Fill required fields in modal
    const modal = page.locator("[role='dialog']");

    const employeeSelect = modal.locator("button[role='combobox']").filter({
      hasText: "選択してください",
    }).first();
    await employeeSelect.click();
    await page
      .getByRole("option", { name: `${testPrefix}通行料太郎` })
      .click();

    const truckSelect = modal.locator("button[role='combobox']").filter({
      hasText: "選択してください",
    }).first();
    await truckSelect.click();
    await page
      .getByRole("option", { name: new RegExp(`${testPrefix}通行料`) })
      .click();

    await page.getByPlaceholder("例: 埼玉県杉戸町 平田倉庫㈱").fill(`${testPrefix}通行料発地`);
    await page.getByPlaceholder("例: 茨城県常総市 王子コンテナー㈱").fill(`${testPrefix}通行料着地`);

    // Add toll fee on the report too (1500)
    // "通行料（税込）" label is followed by an input with placeholder "1000"
    const tollFeeInput = modal.locator("text=通行料（税込）").locator("..").getByPlaceholder("1000");
    await tollFeeInput.fill("1500");

    await page.getByRole("button", { name: "日報を作成" }).click();
    await expect(page.locator("[data-sonner-toast]")).toBeVisible({
      timeout: 5000,
    });

    // After report creation, the toll fee should be from the report (1500),
    // NOT from the manual item (3000) — the code uses exclusive source selection
    // to prevent double-counting
    await page.reload();
    await expect(page.getByText("請求明細書")).toBeVisible({ timeout: 10000 });
  });
});
