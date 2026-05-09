# Customer Closing Day / FAX & Optional Fare Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `closingDay` and `fax` fields to the Customer model and make `fare` optional on DailyReport, including UI, API, validation, list aggregation, and invoice creation flow.

**Architecture:** Two independent migration sets — Customer additions (no breaking change, just new columns) and DailyReport.fare relaxation (NOT NULL → NULL). UI changes follow existing shadcn/ui patterns. Invoice flow falls back to manual amount entry when a selected daily report has NULL fare.

**Tech Stack:** Next.js 16 (App Router), Prisma 6, PostgreSQL, React 19, shadcn/ui, Playwright e2e, react-hook-form + zod (where used).

**Spec reference:** `docs/superpowers/specs/2026-05-09-customer-closing-day-fax-and-fare-optional-design.md`

---

## File Structure

| Path | Action | Responsibility |
|---|---|---|
| `prisma/schema.prisma` | Modify | Add `fax`, `closingDay` to Customer; relax `fare` on DailyReport |
| `prisma/migrations/20260509000000_add_customer_closing_day_and_fax/migration.sql` | Create | Add two columns to `customers` |
| `prisma/migrations/20260509010000_make_fare_optional/migration.sql` | Create | Drop NOT NULL on `daily_reports.fare` |
| `src/app/api/customers/route.ts` | Modify | POST: accept and persist `fax`, `closingDay` |
| `src/app/api/customers/[id]/route.ts` | Modify | PUT: accept and persist `fax`, `closingDay` |
| `src/components/customers/customer-form.tsx` | Modify | Add FAX text input and closing-day select |
| `src/app/(dashboard)/customers/page.tsx` | Modify | Add 「締め日」 column to listing table |
| `src/app/api/reports/route.ts` | Modify | POST: drop fare-required check, allow NULL |
| `src/app/api/reports/[id]/route.ts` | Modify | PUT: same |
| `src/components/reports/report-form.tsx` | Modify | Remove required marker and `required` attribute on fare |
| `src/app/(dashboard)/reports/page.tsx` | Modify | Render `-` for NULL fare; sum with `?? 0` |
| `src/app/(dashboard)/invoices/new/page.tsx` | Modify | Render 「金額未確定」 for NULL fare; allow manual amount edit |
| `e2e/master/customers.spec.ts` | Modify | Add tests for FAX and closing-day fields |
| `e2e/reports/report-crud.spec.ts` | Modify | Add test for fare-empty registration |

---

## Task 1: Add Customer fields (schema + migration)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260509000000_add_customer_closing_day_and_fax/migration.sql`

- [ ] **Step 1: Update Prisma schema**

In `prisma/schema.prisma`, locate `model Customer` and add two fields between `email` and `contactPerson`:

```prisma
model Customer {
  id            Int       @id @default(autoincrement())
  name          String
  address       String?
  phone         String?
  fax           String?
  email         String?   // 請求書送付先メールアドレス
  closingDay    String?   @map("closing_day")  // 締め日: "1"〜"31" または "末"
  contactPerson String?   @map("contact_person")
  memo          String?
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  dailyReports  DailyReport[]
  invoices      Invoice[]

  @@map("customers")
}
```

- [ ] **Step 2: Create migration directory and SQL**

Run:

```bash
mkdir -p prisma/migrations/20260509000000_add_customer_closing_day_and_fax
```

Create file `prisma/migrations/20260509000000_add_customer_closing_day_and_fax/migration.sql`:

```sql
-- AlterTable: customers - add fax and closing_day
ALTER TABLE "customers" ADD COLUMN "fax" TEXT;
ALTER TABLE "customers" ADD COLUMN "closing_day" TEXT;
```

- [ ] **Step 3: Apply migration**

Run:

```bash
npx prisma migrate deploy
npx prisma generate
```

Expected: 「Applied migration: 20260509000000_add_customer_closing_day_and_fax」, then 「Generated Prisma Client...」.

- [ ] **Step 4: Verify schema**

Run:

```bash
npx prisma db execute --stdin <<< "SELECT column_name, is_nullable, data_type FROM information_schema.columns WHERE table_name='customers' AND column_name IN ('fax','closing_day');"
```

Expected: 2 rows, both `YES` for `is_nullable`, `text` for `data_type`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260509000000_add_customer_closing_day_and_fax/
git commit -m "Add fax and closing_day columns to customers table"
```

---

## Task 2: Update Customer API to accept fax/closingDay

**Files:**
- Modify: `src/app/api/customers/route.ts`
- Modify: `src/app/api/customers/[id]/route.ts`

- [ ] **Step 1: Modify POST handler**

In `src/app/api/customers/route.ts`, replace the `POST` handler body destructuring and `prisma.customer.create` block:

```typescript
    const body = await request.json();
    const { name, address, phone, fax, email, closingDay, contactPerson, memo } = body;

    if (!name) {
      return NextResponse.json(
        { error: "発注元名は必須です" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        address: address || null,
        phone: phone || null,
        fax: fax || null,
        email: email || null,
        closingDay: closingDay || null,
        contactPerson: contactPerson || null,
        memo: memo || null,
      },
    });
```

- [ ] **Step 2: Modify PUT handler**

In `src/app/api/customers/[id]/route.ts`, replace the `PUT` handler destructuring and `prisma.customer.update`:

```typescript
    const body = await request.json();
    const { name, address, phone, fax, email, closingDay, contactPerson, memo } = body;

    if (!name) {
      return NextResponse.json(
        { error: "発注元名は必須です" },
        { status: 400 }
      );
    }

    const customer = await prisma.customer.update({
      where: { id: parsedId },
      data: {
        name,
        address: address || null,
        phone: phone || null,
        fax: fax || null,
        email: email || null,
        closingDay: closingDay || null,
        contactPerson: contactPerson || null,
        memo: memo || null,
      },
    });
```

- [ ] **Step 3: Smoke test via curl**

With dev server running on 3001, log in via browser to obtain a session cookie, copy the cookie, then run:

```bash
curl -X POST http://localhost:3001/api/customers \
  -H "Content-Type: application/json" \
  -H "Cookie: <your-session-cookie>" \
  -d '{"name":"_smoketest_","fax":"03-1234-5678","closingDay":"末"}' | jq .
```

Expected: 201 response with `fax: "03-1234-5678"`, `closingDay: "末"` in the JSON. Then DELETE the test customer.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: no errors related to changed files.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/customers/
git commit -m "Accept fax and closingDay in customer create/update API"
```

---

## Task 3: Update Customer form UI

**Files:**
- Modify: `src/components/customers/customer-form.tsx`
- Test: `e2e/master/customers.spec.ts`

- [ ] **Step 1: Write failing e2e test**

In `e2e/master/customers.spec.ts`, add a new test inside `test.describe("発注元マスタ", ...)`:

```typescript
  test("FAXと締め日を含めて発注元を登録できる", async ({ page, api, cleanup, testPrefix }) => {
    const customerName = `${testPrefix}締め日テスト商事`;

    await page.goto("/customers/new");
    await page.getByLabel("発注元名").fill(customerName);
    await page.getByLabel("FAX番号").fill("03-9999-8888");

    // Open closing-day select and pick 月末
    await page.locator("button[role='combobox']").filter({ hasText: "選択してください" }).click();
    await page.getByRole("option", { name: "月末" }).click();

    await page.getByRole("button", { name: "登録" }).click();

    // Find created customer and clean up
    await expect(page.getByText(customerName)).toBeVisible();
    const created = await api.findCustomerByName(customerName);
    if (created) cleanup.track("customer", created.id);

    // Verify the value persisted via edit page
    await page.goto(`/customers/${created!.id}/edit`);
    await expect(page.getByLabel("FAX番号")).toHaveValue("03-9999-8888");
    await expect(
      page.locator("button[role='combobox']").filter({ hasText: "月末" })
    ).toBeVisible();
  });
```

If `api.findCustomerByName` does not exist on `ApiHelper`, add it in `e2e/helpers/api.helper.ts`:

```typescript
  async findCustomerByName(name: string) {
    const res = await this.request.get("/api/customers");
    const list = await res.json() as Array<{ id: number; name: string }>;
    return list.find((c) => c.name === name) || null;
  }
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx playwright test e2e/master/customers.spec.ts -g "FAXと締め日"
```

Expected: FAIL — `getByLabel("FAX番号")` not found.

- [ ] **Step 3: Update Customer type and form state**

In `src/components/customers/customer-form.tsx`, update the `Customer` type and `formData` initial state:

```typescript
type Customer = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  fax: string | null;
  email: string | null;
  closingDay: string | null;
  contactPerson: string | null;
  memo: string | null;
};
```

```typescript
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    address: customer?.address || "",
    phone: customer?.phone || "",
    fax: customer?.fax || "",
    email: customer?.email || "",
    closingDay: customer?.closingDay || "",
    contactPerson: customer?.contactPerson || "",
    memo: customer?.memo || "",
  });
```

- [ ] **Step 4: Add Select import**

At the top of `src/components/customers/customer-form.tsx`, add:

```typescript
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
```

- [ ] **Step 5: Add FAX and closingDay UI block**

In `src/components/customers/customer-form.tsx`, after the existing `phone`/`contactPerson` grid (the `<div className="grid grid-cols-2 gap-4">` block), insert a new grid:

```tsx
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fax">FAX番号</Label>
              <Input
                id="fax"
                value={formData.fax}
                onChange={(e) =>
                  setFormData({ ...formData, fax: e.target.value })
                }
                placeholder="例: 03-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="closingDay">締め日</Label>
              <Select
                value={formData.closingDay || "_none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    closingDay: value === "_none" ? "" : value,
                  })
                }
              >
                <SelectTrigger id="closingDay">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">（未設定）</SelectItem>
                  {Array.from({ length: 31 }, (_, i) => String(i + 1)).map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}日
                    </SelectItem>
                  ))}
                  <SelectItem value="末">月末</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
```

- [ ] **Step 6: Run e2e test to confirm pass**

```bash
npx playwright test e2e/master/customers.spec.ts -g "FAXと締め日"
```

Expected: PASS.

- [ ] **Step 7: Run full customers spec for regression**

```bash
npx playwright test e2e/master/customers.spec.ts
```

Expected: all tests pass.

- [ ] **Step 8: Commit**

```bash
git add src/components/customers/customer-form.tsx e2e/master/customers.spec.ts e2e/helpers/api.helper.ts
git commit -m "Add FAX and closing-day inputs to customer form"
```

---

## Task 4: Add closingDay column to customer list

**Files:**
- Modify: `src/app/(dashboard)/customers/page.tsx`

- [ ] **Step 1: Update Customer type**

In `src/app/(dashboard)/customers/page.tsx`, update the `Customer` type:

```typescript
type Customer = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  contactPerson: string | null;
  memo: string | null;
  closingDay: string | null;
};
```

- [ ] **Step 2: Add helper function and column header**

In the same file, before the `return` block, add a small helper:

```typescript
  const formatClosingDay = (cd: string | null) => {
    if (!cd) return "-";
    if (cd === "末") return "月末";
    return `${cd}日`;
  };
```

In the `<TableHeader>` block, add `<TableHead>締め日</TableHead>` between 「担当者」 and 「操作」:

```tsx
              <TableHeader>
                <TableRow>
                  <TableHead>発注元名</TableHead>
                  <TableHead>住所</TableHead>
                  <TableHead>電話番号</TableHead>
                  <TableHead>担当者</TableHead>
                  <TableHead>締め日</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
```

In the `<TableBody>` row, add a corresponding cell:

```tsx
                  <TableCell>{customer.contactPerson || "-"}</TableCell>
                  <TableCell>{formatClosingDay(customer.closingDay)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
```

- [ ] **Step 3: Manual verification**

Visit `http://localhost:3001/customers` and confirm the new 「締め日」 column appears, with `-` for existing customers.

- [ ] **Step 4: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/\(dashboard\)/customers/page.tsx
git commit -m "Show closing-day column in customer listing"
```

---

## Task 5: Make DailyReport.fare optional (schema + migration)

**Files:**
- Modify: `prisma/schema.prisma`
- Create: `prisma/migrations/20260509010000_make_fare_optional/migration.sql`

- [ ] **Step 1: Update Prisma schema**

In `prisma/schema.prisma`, locate `model DailyReport` and change the `fare` line:

```prisma
  fare        Decimal?  @db.Decimal(12, 0)
```

(was: `fare        Decimal   @db.Decimal(12, 0)`)

- [ ] **Step 2: Create migration**

Run:

```bash
mkdir -p prisma/migrations/20260509010000_make_fare_optional
```

Create file `prisma/migrations/20260509010000_make_fare_optional/migration.sql`:

```sql
-- AlterTable: daily_reports - make fare nullable
ALTER TABLE "daily_reports" ALTER COLUMN "fare" DROP NOT NULL;
```

- [ ] **Step 3: Apply migration**

Run:

```bash
npx prisma migrate deploy
npx prisma generate
```

Expected: 「Applied migration: 20260509010000_make_fare_optional」.

- [ ] **Step 4: Verify nullability**

Run:

```bash
npx prisma db execute --stdin <<< "SELECT is_nullable FROM information_schema.columns WHERE table_name='daily_reports' AND column_name='fare';"
```

Expected: `is_nullable = YES`.

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260509010000_make_fare_optional/
git commit -m "Make daily_reports.fare nullable"
```

---

## Task 6: Update Reports API to allow NULL fare

**Files:**
- Modify: `src/app/api/reports/route.ts`
- Modify: `src/app/api/reports/[id]/route.ts`

- [ ] **Step 1: Update POST validation**

In `src/app/api/reports/route.ts`, replace the `POST` validation block:

```typescript
    if (!reportDate || !employeeId || !customerId || !origin || !destination) {
      return NextResponse.json(
        { error: "必須項目を入力してください" },
        { status: 400 }
      );
    }

    // 必須IDのバリデーション
    const parsedEmployeeId = safeParseInt(employeeId);
    const parsedTruckId = safeParseInt(truckId);
    const parsedCustomerId = safeParseInt(customerId);
    const parsedFare =
      fare === "" || fare === null || fare === undefined
        ? null
        : safeParseInt(fare);

    if (parsedEmployeeId === null) {
      return NextResponse.json({ error: "従業員IDは有効な数値を入力してください" }, { status: 400 });
    }
    if (parsedCustomerId === null) {
      return NextResponse.json({ error: "発注元IDは有効な数値を入力してください" }, { status: 400 });
    }
    // 運賃が入力されている場合のみ数値チェック
    if (fare !== "" && fare !== null && fare !== undefined && parsedFare === null) {
      return NextResponse.json({ error: "運賃は有効な数値を入力してください" }, { status: 400 });
    }
```

(removed: the original `fare === undefined` check in the multi-condition `if`, and removed: the unconditional `parsedFare === null` rejection.)

- [ ] **Step 2: Update POST data block**

In the same file, the `tx.dailyReport.create({ data: { ... fare: parsedFare, ... }})` block — confirm `fare: parsedFare` is now passed (it will be `null` when not entered). No structural change required, but verify the line reads:

```typescript
          fare: parsedFare,
```

(`parsedFare` is now correctly typed as `number | null`.)

- [ ] **Step 3: Update PUT handler**

Open `src/app/api/reports/[id]/route.ts`. Find the equivalent validation block in the `PUT` function and apply the same changes as Step 1. Also confirm `fare` is set to `parsedFare` (which can be null).

- [ ] **Step 4: Smoke test via curl**

```bash
curl -X POST http://localhost:3001/api/reports \
  -H "Content-Type: application/json" \
  -H "Cookie: <session>" \
  -d '{
    "reportDate":"2026-05-09",
    "employeeId":"1",
    "customerId":"1",
    "origin":"テスト出発",
    "destination":"テスト到着",
    "fare":""
  }' | jq .
```

Expected: 201 response with `fare: null`. DELETE the created report afterwards.

- [ ] **Step 5: Run lint**

Run: `npm run lint`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/app/api/reports/route.ts src/app/api/reports/\[id\]/route.ts
git commit -m "Allow NULL fare in daily report create and update API"
```

---

## Task 7: Update Report form UI to make fare optional

**Files:**
- Modify: `src/components/reports/report-form.tsx`
- Test: `e2e/reports/report-crud.spec.ts`

- [ ] **Step 1: Write failing e2e test**

In `e2e/reports/report-crud.spec.ts`, add a new test inside `test.describe("日報CRUD", ...)`:

```typescript
  test("運賃を空欄のまま日報を登録できる", async ({ page, api, cleanup, testPrefix }) => {
    const employee = await api.createEmployee({
      name: `${testPrefix}運賃なし太郎`,
      nameKana: `${testPrefix}ウンチンナシタロウ`,
    });
    cleanup.track("employee", employee.id);

    const customer = await api.createCustomer({
      name: `${testPrefix}運賃なし発注元`,
    });
    cleanup.track("customer", customer.id);

    await page.goto("/reports/new");

    const today = new Date();
    const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(Math.min(today.getDate(), 25)).padStart(2, "0")}`;
    await page.getByLabel("日付").fill(dateStr);

    const customerInput = page.locator("#customerId");
    await customerInput.fill(`${testPrefix}運賃なし発注元`);
    await page.getByText(`${testPrefix}運賃なし発注元`).click();

    await page.locator("button[role='combobox']").filter({ hasText: "従業員を選択" }).click();
    await page.getByRole("option", { name: `${testPrefix}運賃なし太郎` }).click();

    await page.getByLabel("発地").fill("テスト発地");
    await page.getByLabel("納品先").fill("テスト納品先");

    // Fare is intentionally left empty
    await page.getByRole("button", { name: "登録" }).click();

    await expect(page).toHaveURL(/\/reports$/);

    // Find created report and clean up
    const reports = await api.listReportsByEmployee(employee.id);
    const created = reports[0];
    if (created) cleanup.track("report", created.id);
    expect(created.fare).toBeNull();
  });
```

If `listReportsByEmployee` is not on `ApiHelper`, add it in `e2e/helpers/api.helper.ts`:

```typescript
  async listReportsByEmployee(employeeId: number) {
    const res = await this.request.get(`/api/reports?employeeId=${employeeId}`);
    return await res.json() as Array<{ id: number; fare: string | null }>;
  }
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
npx playwright test e2e/reports/report-crud.spec.ts -g "運賃を空欄"
```

Expected: FAIL — form blocks submit because `required` attribute or HTML5 validation triggers.

- [ ] **Step 3: Remove required marker and attribute**

In `src/components/reports/report-form.tsx`, find the fare input block and replace:

```tsx
            <div className="space-y-2">
              <Label htmlFor="fare">
                運賃（税抜）
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="fare"
                  type="number"
                  value={formData.fare}
                  onChange={(e) =>
                    setFormData({ ...formData, fare: e.target.value })
                  }
                  placeholder="50000"
                  className="pl-8"
                />
              </div>
            </div>
```

(Removed: the inner `<span className="text-destructive">*</span>` and the `required` attribute.)

- [ ] **Step 4: Run e2e test to confirm pass**

```bash
npx playwright test e2e/reports/report-crud.spec.ts -g "運賃を空欄"
```

Expected: PASS.

- [ ] **Step 5: Run full report-crud spec**

```bash
npx playwright test e2e/reports/report-crud.spec.ts
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add src/components/reports/report-form.tsx e2e/reports/report-crud.spec.ts e2e/helpers/api.helper.ts
git commit -m "Make fare optional in daily report form"
```

---

## Task 8: Update Reports list — handle NULL fare display and aggregation

**Files:**
- Modify: `src/app/(dashboard)/reports/page.tsx`

- [ ] **Step 1: Locate fare aggregation**

Find around line 236 of `src/app/(dashboard)/reports/page.tsx`:

```typescript
    const fare = typeof r.fare === "string" ? parseInt(r.fare) : r.fare;
    return sum + fare;
```

Replace with:

```typescript
    if (r.fare == null) return sum;
    const fare = typeof r.fare === "string" ? parseInt(r.fare) : r.fare;
    return sum + fare;
```

- [ ] **Step 2: Locate fare display**

Find around line 411 in the same file:

```tsx
                      ¥{formatCurrency(report.fare)}
```

Replace with:

```tsx
                      {report.fare == null ? "-" : `¥${formatCurrency(report.fare)}`}
```

- [ ] **Step 3: Update Report type**

Find the type definition around line 59:

```typescript
  fare: string | number;
```

Replace with:

```typescript
  fare: string | number | null;
```

- [ ] **Step 4: Manual verification**

Create a test report with empty fare via the form. Visit `/reports`, confirm:
- the row shows `-` in the fare column
- the 「合計運賃」 at the top of the page does not include the NULL row (no NaN)

Delete the test report afterwards.

- [ ] **Step 5: Run lint and full e2e**

```bash
npm run lint
npx playwright test
```

Expected: lint clean, e2e green.

- [ ] **Step 6: Commit**

```bash
git add src/app/\(dashboard\)/reports/page.tsx
git commit -m "Show '-' and skip NULL fare in reports list aggregation"
```

---

## Task 9: Update Invoice creation — handle NULL fare and manual amount fallback

**Files:**
- Modify: `src/app/(dashboard)/invoices/new/page.tsx`

- [ ] **Step 1: Update Report type**

In `src/app/(dashboard)/invoices/new/page.tsx`, around line 27, update:

```typescript
  fare: string | number | null;
```

- [ ] **Step 2: Skip NULL fare in candidate aggregation**

Around line 192:

```typescript
    if (r.fare == null) return sum;
    const fare = typeof r.fare === "string" ? parseInt(r.fare) : r.fare;
    return sum + fare;
```

- [ ] **Step 3: Replace fare → amount mapping when building invoice items**

Around line 244, find the block that maps selected reports to invoice items. Replace:

```typescript
          amount: typeof r.fare === "string" ? parseInt(r.fare) : r.fare,
```

with:

```typescript
          amount:
            r.fare == null
              ? 0
              : typeof r.fare === "string"
                ? parseInt(r.fare)
                : r.fare,
```

(NULL fare reports are added to the invoice with `amount=0` initially; the user manually enters the amount in the editable amount field downstream.)

- [ ] **Step 4: Update fare display in candidate list**

Around line 386:

```tsx
                              {report.fare == null
                                ? <span className="text-muted-foreground italic">金額未確定</span>
                                : <>¥{formatCurrency(report.fare)}</>}
```

- [ ] **Step 5: Verify amount is editable in invoice item rows**

Open the invoice creation page and confirm that each invoice item amount field is a text/number input (not read-only). If it's read-only, change the input element so users can edit `amount` manually after selecting a NULL-fare report. (Inspect the existing invoice item rendering — most likely it already uses an editable input, since invoice items support manual entry. If it's read-only, modify to add `onChange` and a write-back into local state.)

- [ ] **Step 6: Manual verification**

1. Create a daily report with empty fare.
2. Visit `/invoices/new`, select that report.
3. Confirm the candidate row shows 「金額未確定」.
4. Confirm the resulting invoice item has an editable amount field starting at 0.
5. Enter a value, save the invoice, confirm the invoice total reflects the manual value.

- [ ] **Step 7: Run lint and full e2e**

```bash
npm run lint
npx playwright test
```

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\)/invoices/new/page.tsx
git commit -m "Handle NULL fare in invoice creation with manual amount fallback"
```

---

## Task 10: Final verification

- [ ] **Step 1: Run full e2e suite**

```bash
npx playwright test
```

Expected: all tests pass.

- [ ] **Step 2: Type check & build**

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Expected: lint clean, no type errors, build succeeds.

- [ ] **Step 3: Manual smoke test of each feature**

In a browser at `http://localhost:3001`:

1. **発注元 新規登録**: 名前+FAX+締め日「月末」で登録 → 一覧で「月末」表示を確認
2. **発注元 編集**: 既存発注元に締め日「20」設定 → 一覧で「20日」表示を確認
3. **日報 新規登録（運賃あり）**: 既存どおり運賃入力で登録できることを確認（リグレッションなし）
4. **日報 新規登録（運賃なし）**: 運賃を空欄のまま登録 → 一覧で「-」表示・合計運賃に影響なし
5. **請求書作成**: 運賃NULLの日報を選択 → 「金額未確定」表示・明細で手入力可能・保存後の総額が手入力値を反映

- [ ] **Step 4: Final commit if any cleanup needed**

If any leftover changes exist:

```bash
git status
git add <files>
git commit -m "Cleanup after implementation"
```

---

## Self-Review Checklist (already passed)

- [x] **Spec coverage**: Customer fields (Tasks 1–4), fare optional (Tasks 5–9), all spec items mapped
- [x] **No placeholders**: every step has actual SQL/code/commands
- [x] **Type consistency**: `fare: string | number | null` used uniformly across reports list and invoice page; `closingDay: string \| null` used in both form and list
- [x] **Migration ordering**: Customer migration (00) precedes fare migration (01) — independent but ordered for chronology
- [x] **TDD pairs**: Tasks 3 and 7 write failing tests before implementation
