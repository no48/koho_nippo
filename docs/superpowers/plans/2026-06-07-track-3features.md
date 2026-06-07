# track 3機能 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 得意先セレクトの全件表示・締め日ベースの請求書作成・日報のまとめ入力（＋着地の住所）の3機能を、既存仕様を壊さず追加する。

**Architecture:** 既存の「1日報＝配送1件」データ構造を維持（A案）。締め日→期間の計算は純粋関数 `getCustomerBillingPeriod` に集約。日報の採番ロジックは共通ヘルパー `generateReportNumber` に抽出し、単件POSTとまとめ入力APIで共有する。

**Tech Stack:** Next.js 16 (App Router) / React 19 / Prisma 6 / PostgreSQL / TypeScript / Tailwind / shadcn-ui。検証は `npm run build`（型チェック）・`npm run lint`・`npx tsx`（純粋関数の検証）。

参照スペック: `docs/superpowers/specs/2026-06-07-track-3features-design.md`

---

## テスト方針の前提

- 単体テスト基盤（jest/vitest）は無い。新規導入はしない（スコープ外）。
- 純粋関数（`getCustomerBillingPeriod`）は `scripts/verify-billing-period.ts` をアサーション付きで作り `npx tsx` で実行＝テスト代わりにする（TDDで先に書いて失敗を確認 → 実装 → 成功を確認）。
- API/UI は `npm run build`（型エラー検出）と `npm run lint` を必須の検証ステップとする。加えて各機能の最後に手動の実機確認手順を記載。

---

# フェーズA（③ 得意先が最初から全部出る）

## Task 1: CustomerAutocomplete を全件表示に変更

**Files:**
- Modify: `src/components/ui/customer-autocomplete.tsx:55-64`（フィルタ部分）
- Modify: `src/components/ui/customer-autocomplete.tsx:125`（ドロップダウンの高さ）

- [ ] **Step 1: フィルタの10件制限を撤廃**

`src/components/ui/customer-autocomplete.tsx` の以下のブロック（55-64行付近）を置き換える。

置換前:
```tsx
  // Filter customers based on input
  useEffect(() => {
    if (inputValue.length < 1) {
      setFilteredCustomers(customers.slice(0, 10));
    } else {
      const filtered = customers.filter((c) =>
        c.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredCustomers(filtered.slice(0, 10));
    }
  }, [inputValue, customers]);
```

置換後:
```tsx
  // Filter customers based on input
  // 入力が空ならフォーカス時に全件表示、入力があれば部分一致で全件絞り込み
  useEffect(() => {
    if (inputValue.length < 1) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter((c) =>
        c.name.toLowerCase().includes(inputValue.toLowerCase())
      );
      setFilteredCustomers(filtered);
    }
  }, [inputValue, customers]);
```

- [ ] **Step 2: ドロップダウンの高さを拡大（件数が増えてもスクロールで対応）**

`src/components/ui/customer-autocomplete.tsx` の `<ul ...>`（125行付近）の `max-h-48` を `max-h-72` に変更する。

置換前:
```tsx
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto">
```
置換後:
```tsx
        <ul className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-y-auto">
```

- [ ] **Step 3: ビルドで型・コンパイル確認**

Run: `npm run build`
Expected: ビルド成功（エラーなし）

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: 新規エラーなし

- [ ] **Step 5: コミット**

```bash
git add src/components/ui/customer-autocomplete.tsx
git commit -m "feat: show all customers in autocomplete dropdown"
```

**手動確認（実機）:** 日報フォームと請求書作成画面で発注元欄をクリック → 文字を打たなくても全得意先が表示され、スクロールできること。文字入力で絞り込めること。

---

# フェーズB（④ 請求書を締め日ベースで作成）

## Task 2: 締め日→期間の計算ユーティリティ

**Files:**
- Create: `src/lib/billing-period.ts`
- Create: `scripts/verify-billing-period.ts`（検証スクリプト＝テスト代わり）

- [ ] **Step 1: 検証スクリプト（失敗するテスト）を先に書く**

Create `scripts/verify-billing-period.ts`:
```ts
import { getCustomerBillingPeriod } from "../src/lib/billing-period";

let failed = 0;
function check(label: string, actual: string, expected: string) {
  const ok = actual === expected;
  if (!ok) failed++;
  console.log(`${ok ? "PASS" : "FAIL"}: ${label} => ${actual}${ok ? "" : ` (expected ${expected})`}`);
}

function fmt(d: Date) {
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// 締め日20、2026-05 → 2026/4/21〜2026/5/20
let p = getCustomerBillingPeriod("20", "2026-05");
check("20締め start", fmt(p.startDate), "2026-4-21");
check("20締め end", fmt(p.endDate), "2026-5-20");
check("20締め text", p.displayText, "4/21〜5/20");

// 締め日25（既存の全社締めと一致）、2026-05 → 4/26〜5/25
p = getCustomerBillingPeriod("25", "2026-05");
check("25締め start", fmt(p.startDate), "2026-4-26");
check("25締め end", fmt(p.endDate), "2026-5-25");

// 末締め、2026-05 → 5/1〜5/31
p = getCustomerBillingPeriod("末", "2026-05");
check("末締め start", fmt(p.startDate), "2026-5-1");
check("末締め end", fmt(p.endDate), "2026-5-31");
check("末締め text", p.displayText, "5/1〜5/31");

// 締め日31、2026-02（短い月）→ 開始2/1、終了2/28
p = getCustomerBillingPeriod("31", "2026-02");
check("31締め2月 start", fmt(p.startDate), "2026-2-1");
check("31締め2月 end", fmt(p.endDate), "2026-2-28");

// 未設定（null）→ 全社25日締めにフォールバック、2026-05 → 4/26〜5/25
p = getCustomerBillingPeriod(null, "2026-05");
check("null start", fmt(p.startDate), "2026-4-26");
check("null end", fmt(p.endDate), "2026-5-25");

console.log(failed === 0 ? "\nALL PASS" : `\n${failed} FAILED`);
process.exit(failed === 0 ? 0 : 1);
```

- [ ] **Step 2: 失敗を確認**

Run: `npx tsx scripts/verify-billing-period.ts`
Expected: FAIL（`getCustomerBillingPeriod` が存在せずエラー）

- [ ] **Step 3: ユーティリティを実装**

Create `src/lib/billing-period.ts`:
```ts
import { getPayrollPeriod, type PayrollPeriod } from "./payroll-period";

/**
 * 得意先の締め日を元に「対象年月」の請求対象期間を計算する。
 *
 * - 数値の締め日 D: 「N月分」= 前月(D+1)日 〜 当月D日
 *     - 当月に D 日が無い場合（例: D=31, 2月）は当月末日に丸める
 *     - 前月に D 日が無い場合は前月末日に丸め、その翌日（=当月1日）を開始日とする
 * - "末": 「N月分」= 当月1日 〜 当月末日
 * - null/未設定: 全社25日締め（getPayrollPeriod と同じ 前月26日〜当月25日）にフォールバック
 *
 * @param closingDay "1"〜"31" / "末" / null
 * @param yearMonth "YYYY-MM"
 */
export function getCustomerBillingPeriod(
  closingDay: string | null | undefined,
  yearMonth: string
): PayrollPeriod {
  if (!closingDay) {
    return getPayrollPeriod(yearMonth);
  }

  const [year, month] = yearMonth.split("-").map(Number); // month: 1-12

  // 末締め: 当月1日 〜 当月末日
  if (closingDay === "末") {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // 当月末日
    return {
      startDate,
      endDate,
      displayText: `${month}/1〜${month}/${endDate.getDate()}`,
    };
  }

  const day = Number(closingDay);

  // 当月の締め日（当月末で丸め）
  const curMonthLastDay = new Date(year, month, 0).getDate();
  const endDay = Math.min(day, curMonthLastDay);
  const endDate = new Date(year, month - 1, endDay);

  // 前月の締め日（前月末で丸め）の翌日が開始日
  // JSのDateは日付オーバーフローを自動繰り上げするため、前月末+1日は当月1日になる
  const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
  const prevEndDay = Math.min(day, prevMonthLastDay);
  const startDate = new Date(year, month - 2, prevEndDay + 1);

  return {
    startDate,
    endDate,
    displayText: `${startDate.getMonth() + 1}/${startDate.getDate()}〜${endDate.getMonth() + 1}/${endDate.getDate()}`,
  };
}
```

- [ ] **Step 4: 検証が通ることを確認**

Run: `npx tsx scripts/verify-billing-period.ts`
Expected: `ALL PASS`

- [ ] **Step 5: コミット**

```bash
git add src/lib/billing-period.ts scripts/verify-billing-period.ts
git commit -m "feat: add customer closing-date billing period util"
```

---

## Task 3: 未請求日報APIに期間絞り込みを追加

**Files:**
- Modify: `src/app/api/reports/unbilled/route.ts`

- [ ] **Step 1: startDate/endDate クエリで絞り込めるようにする**

`src/app/api/reports/unbilled/route.ts` の `customerId` 取得直後〜`findMany` の `where` を、期間絞り込み対応に変更する。

`const customerId = searchParams.get("customerId");` の直後に追加:
```ts
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
```

`findMany` の `where` を以下に置き換える:
```ts
    const reports = await prisma.dailyReport.findMany({
      where: {
        customerId: parsedCustomerId,
        invoiceItems: {
          none: {},
        },
        invoiceItemId: null, // 請求書→日報フローでも紐付けがないことを確認
        ...(startDate && endDate
          ? { reportDate: { gte: new Date(startDate), lte: new Date(endDate) } }
          : {}),
      },
      include: {
        employee: true,
        truck: true,
        customer: true,
      },
      orderBy: { reportDate: "asc" },
    });
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: 成功

- [ ] **Step 3: コミット**

```bash
git add src/app/api/reports/unbilled/route.ts
git commit -m "feat: filter unbilled reports by date range"
```

---

## Task 4: 請求書作成画面に「対象月」＋締め日自動集計を追加

**Files:**
- Modify: `src/app/(dashboard)/invoices/new/page.tsx`

方針: 「対象月」セレクタを追加。発注元と対象月が揃ったら、その得意先の `closingDay` から期間を計算し、期間内の未請求日報を取得して全選択。期間テキストを表示。既存の日報一覧経由フロー（reportIds）と手動明細はそのまま残す。

- [ ] **Step 1: import と状態を追加**

`src/app/(dashboard)/invoices/new/page.tsx` の上部 import 群に追加:
```tsx
import { getCustomerBillingPeriod } from "@/lib/billing-period";
import { getCurrentPayrollYearMonth } from "@/lib/payroll-period";
```

`NewInvoicePageContent` 内の state 定義群（`const [manualItems, ...]` の下あたり）に追加:
```tsx
  // 締め日ベース集計用
  const [customers, setCustomers] = useState<{ id: number; name: string; closingDay: string | null }[]>([]);
  const [targetYearMonth, setTargetYearMonth] = useState<string>(() =>
    getCurrentPayrollYearMonth(new Date())
  );
  const [billingPeriodText, setBillingPeriodText] = useState<string>("");
```

- [ ] **Step 2: 得意先一覧（closingDay付き）を取得**

`NewInvoicePageContent` 内に useEffect を追加（既存の useEffect 群の近く）:
```tsx
  // 得意先一覧（締め日取得用）
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("/api/customers");
        if (res.ok) setCustomers(await res.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchCustomers();
  }, []);
```

- [ ] **Step 3: 発注元＋対象月で締め日期間集計する useEffect を追加**

既存の「customerId が変わったら全未請求を取る」useEffect（102-126行）は、初期遷移(reportIds)用に残しつつ、締め日集計を別 useEffect で行う。以下を追加:
```tsx
  // 発注元＋対象月 → 締め日で期間を計算し、期間内の未請求日報を取得して全選択
  useEffect(() => {
    if (initialReportIds.length > 0) return; // 日報一覧からの遷移時は対象外
    if (!customerId || !targetYearMonth || customers.length === 0) {
      setBillingPeriodText("");
      return;
    }
    const customer = customers.find((c) => c.id.toString() === customerId);
    const period = getCustomerBillingPeriod(customer?.closingDay ?? null, targetYearMonth);
    setBillingPeriodText(period.displayText);

    const start = period.startDate.toISOString().split("T")[0];
    const end = period.endDate.toISOString().split("T")[0];

    const fetchPeriodReports = async () => {
      try {
        const res = await fetch(
          `/api/reports/unbilled?customerId=${customerId}&startDate=${start}&endDate=${end}`
        );
        if (res.ok) {
          const data = await res.json();
          setUnbilledReports(data);
          setSelectedReportIds(data.map((r: DailyReport) => r.id)); // 期間内を全選択
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchPeriodReports();
  }, [customerId, targetYearMonth, customers, initialReportIds]);
```

注意: 既存の102-126行の useEffect（customerId のみで全未請求取得）は、この新 useEffect と二重取得にならないよう **削除する**（締め日集計に一本化）。日報一覧からの遷移（initialReportIds）フローは74-100行の useEffect でカバーされるため影響なし。

- [ ] **Step 4: 「対象月」セレクタと期間表示を基本情報カードに追加**

基本情報カードの発注元 `<div className="space-y-2">...CustomerAutocomplete...</div>` の後（同じ grid 内）に、対象月セレクタを追加する。年・月は `<input type="month">` を使うと簡潔:
```tsx
              <div className="space-y-2">
                <Label htmlFor="targetMonth">対象月</Label>
                <Input
                  id="targetMonth"
                  type="month"
                  value={targetYearMonth}
                  onChange={(e) => setTargetYearMonth(e.target.value)}
                />
                {customerId && billingPeriodText && (
                  <p className="text-xs text-muted-foreground">
                    対象期間: {billingPeriodText}（締め日基準）
                  </p>
                )}
              </div>
```
※ grid が `grid-cols-2` のため、必要に応じて発行日／発注元／対象月が綺麗に並ぶよう、基本情報カードの grid を `grid-cols-3` に調整してよい（発行日・発注元・対象月の3つ）。

- [ ] **Step 5: ビルド確認**

Run: `npm run build`
Expected: 成功

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: 新規エラーなし

- [ ] **Step 7: コミット**

```bash
git add src/app/(dashboard)/invoices/new/page.tsx
git commit -m "feat: closing-date-based invoice creation by customer and month"
```

**手動確認（実機）:** 請求書作成画面で発注元と対象月を選ぶ → 期間テキスト（例 4/21〜5/20）が表示され、その期間の未請求日報が自動で全選択される。日報一覧から「請求書作成」で遷移した場合は従来どおり選択済みで表示される。手動明細も従来どおり追加できる。

---

# フェーズC（② 日報まとめ入力 ＋ 着地の住所）

## Task 5: DBに「着地の住所」カラムを追加

**Files:**
- Modify: `prisma/schema.prisma:113-114`（destination の付近）

- [ ] **Step 1: スキーマにカラム追加**

`prisma/schema.prisma` の `DailyReport` 内、`destination String` の直後に1行追加:
```prisma
  destination String
  destinationAddress String?   @map("destination_address")  // 着地の住所
```

- [ ] **Step 2: マイグレーション作成・適用**

Run: `npx prisma migrate dev --name add_destination_address_to_daily_report`
Expected: マイグレーション生成・適用成功、Prisma Client 再生成

- [ ] **Step 3: ビルド確認**

Run: `npm run build`
Expected: 成功

- [ ] **Step 4: コミット**

```bash
git add prisma/schema.prisma prisma/migrations
git commit -m "feat: add destinationAddress column to DailyReport"
```

---

## Task 6: 日報採番ロジックを共通ヘルパーに抽出

**Files:**
- Create: `src/lib/report-number.ts`
- Modify: `src/app/api/reports/route.ts`（POST内の採番を置換）

- [ ] **Step 1: 共通ヘルパーを作成**

Create `src/lib/report-number.ts`:
```ts
import type { Prisma } from "@prisma/client";
import { safeParseInt } from "./api-auth";

/**
 * 同一トランザクション内で日報番号(YYYYMMDD-XXX)を採番する。
 * トランザクション内で順次呼べば、直前に作成した日報も考慮して連番になる。
 */
export async function generateReportNumber(
  tx: Prisma.TransactionClient,
  reportDate: Date
): Promise<string> {
  const dateStr = `${reportDate.getFullYear()}${String(reportDate.getMonth() + 1).padStart(2, "0")}${String(reportDate.getDate()).padStart(2, "0")}`;

  const last = await tx.dailyReport.findFirst({
    where: { reportNumber: { startsWith: dateStr } },
    orderBy: { reportNumber: "desc" },
  });

  let sequence = 1;
  if (last) {
    const lastSequence = safeParseInt(last.reportNumber.split("-")[1]) || 0;
    sequence = lastSequence + 1;
  }
  return `${dateStr}-${String(sequence).padStart(3, "0")}`;
}
```

- [ ] **Step 2: 既存POSTを共通ヘルパー利用に置き換え**

`src/app/api/reports/route.ts` の冒頭 import に追加:
```ts
import { generateReportNumber } from "@/lib/report-number";
```

`prisma.$transaction(async (tx) => { ... })` 内の採番ブロック（`const date = new Date(reportDate);` から `const reportNumber = ...;` まで）を以下1行に置換:
```ts
      const reportNumber = await generateReportNumber(tx, new Date(reportDate));
```

- [ ] **Step 3: ビルド確認**

Run: `npm run build`
Expected: 成功（既存POSTの挙動は不変）

- [ ] **Step 4: コミット**

```bash
git add src/lib/report-number.ts src/app/api/reports/route.ts
git commit -m "refactor: extract report number generation helper"
```

---

## Task 7: まとめ入力の一括作成API

**Files:**
- Create: `src/app/api/reports/batch/route.ts`

- [ ] **Step 1: 一括作成APIを実装**

Create `src/app/api/reports/batch/route.ts`:
```ts
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, safeParseInt } from "@/lib/api-auth";
import { generateReportNumber } from "@/lib/report-number";

type BatchRow = {
  customerId?: string | number;
  origin?: string;
  destination?: string;
  destinationAddress?: string;
  productName?: string;
  quantity?: string | number;
  salary?: string | number;
  fare?: string | number;
  tollFee?: string | number;
  distanceAllowance?: string | number;
  wageType?: string;
};

// POST /api/reports/batch - 同一の日付/従業員/トラックで複数日報を一括作成
export async function POST(request: Request) {
  try {
    const authResult = await requireAuth();
    if (authResult.error) return authResult.error;
    const session = authResult.session;

    const body = await request.json();
    const { reportDate, employeeId, truckId, reportType, rows } = body as {
      reportDate?: string;
      employeeId?: string | number;
      truckId?: string | number;
      reportType?: string;
      rows?: BatchRow[];
    };

    if (!reportDate || !employeeId) {
      return NextResponse.json({ error: "日付と従業員は必須です" }, { status: 400 });
    }
    const parsedEmployeeId = safeParseInt(employeeId);
    if (parsedEmployeeId === null) {
      return NextResponse.json({ error: "従業員IDは有効な数値を入力してください" }, { status: 400 });
    }
    const parsedTruckId = safeParseInt(truckId);

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ error: "明細行がありません" }, { status: 400 });
    }

    // 完全な空行はスキップ、一部入力で必須欠けはエラー
    const isEmptyRow = (r: BatchRow) =>
      !r.customerId && !r.origin && !r.destination && !r.destinationAddress &&
      !r.productName && !r.quantity && !r.salary && !r.fare && !r.tollFee &&
      !r.distanceAllowance && !r.wageType;

    const validRows: { customerId: number; origin: string; destination: string; row: BatchRow }[] = [];
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (isEmptyRow(r)) continue;
      const cid = safeParseInt(r.customerId);
      if (cid === null || !r.origin || !r.destination) {
        return NextResponse.json(
          { error: `${i + 1}行目: 得意先・発地・着地は必須です` },
          { status: 400 }
        );
      }
      validRows.push({ customerId: cid, origin: r.origin, destination: r.destination, row: r });
    }

    if (validRows.length === 0) {
      return NextResponse.json({ error: "入力された明細行がありません" }, { status: 400 });
    }

    const created = await prisma.$transaction(async (tx) => {
      const results = [];
      for (const v of validRows) {
        const reportNumber = await generateReportNumber(tx, new Date(reportDate));
        const r = v.row;
        const parsedFare =
          r.fare === "" || r.fare === null || r.fare === undefined ? null : safeParseInt(r.fare);
        const report = await tx.dailyReport.create({
          data: {
            reportNumber,
            reportDate: new Date(reportDate),
            reportType: reportType || null,
            employeeId: parsedEmployeeId,
            truckId: parsedTruckId || null,
            customerId: v.customerId,
            origin: v.origin,
            destination: v.destination,
            destinationAddress: r.destinationAddress || null,
            productName: r.productName || null,
            quantity: safeParseInt(r.quantity),
            fare: parsedFare,
            salary: safeParseInt(r.salary),
            tollFee: safeParseInt(r.tollFee) ?? 0,
            distanceAllowance: safeParseInt(r.distanceAllowance) ?? 0,
            wageType: r.wageType || null,
            createdById: session?.user?.id || null,
          },
        });
        results.push(report);
      }
      return results;
    });

    return NextResponse.json({ count: created.length, reports: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to batch create reports:", error);
    return NextResponse.json({ error: "日報の一括登録に失敗しました" }, { status: 500 });
  }
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: 成功

- [ ] **Step 3: コミット**

```bash
git add src/app/api/reports/batch/route.ts
git commit -m "feat: add batch daily report creation API"
```

---

## Task 8: まとめ入力ページ

**Files:**
- Create: `src/app/(dashboard)/reports/batch/page.tsx`

- [ ] **Step 1: まとめ入力ページを実装**

Create `src/app/(dashboard)/reports/batch/page.tsx`:
```tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CustomerAutocomplete } from "@/components/ui/customer-autocomplete";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Employee = { id: number; name: string };
type Truck = { id: number; vehicleNumber: string; vehicleName: string };

type Row = {
  uid: string;
  customerId: string;
  customerName: string;
  origin: string;
  destination: string;
  destinationAddress: string;
  productName: string;
  quantity: string;
  salary: string;
  fare: string;
  tollFee: string;
  distanceAllowance: string;
  wageType: string;
};

let rowCounter = 0;
const newRow = (): Row => ({
  uid: `row-${rowCounter++}`,
  customerId: "", customerName: "", origin: "", destination: "",
  destinationAddress: "", productName: "", quantity: "", salary: "",
  fare: "", tollFee: "0", distanceAllowance: "0", wageType: "",
});

export default function BatchReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [wageTypes, setWageTypes] = useState<string[]>([]);

  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [employeeId, setEmployeeId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, truckRes, wageRes] = await Promise.all([
          fetch("/api/employees"),
          fetch("/api/trucks"),
          fetch("/api/wage-rates"),
        ]);
        if (empRes.ok) setEmployees(await empRes.json());
        if (truckRes.ok) setTrucks(await truckRes.json());
        if (wageRes.ok) {
          const data = await wageRes.json();
          setWageTypes([...new Set<string>(data.map((w: { wageType: string }) => w.wageType))].sort());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const updateRow = (uid: string, field: keyof Row, value: string) => {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (uid: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.uid !== uid) : prev));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("従業員を選択してください");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/reports/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate,
          employeeId,
          truckId: truckId || null,
          rows: rows.map((r) => ({
            customerId: r.customerId,
            origin: r.origin,
            destination: r.destination,
            destinationAddress: r.destinationAddress,
            productName: r.productName,
            quantity: r.quantity,
            salary: r.salary,
            fare: r.fare,
            tollFee: r.tollFee,
            distanceAllowance: r.distanceAllowance,
            wageType: r.wageType,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "エラーが発生しました");
      }
      const data = await res.json();
      toast.success(`${data.count}件の日報を登録しました`);
      router.push("/reports");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">日報まとめ入力</h1>
        <p className="text-muted-foreground">同じ従業員・日付の配送を複数行まとめて登録します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>共通情報</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportDate">日付 <span className="text-destructive">*</span></Label>
                <Input id="reportDate" type="date" value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>従業員 <span className="text-destructive">*</span></Label>
                <Select value={employeeId} onValueChange={setEmployeeId} required>
                  <SelectTrigger><SelectValue placeholder="従業員を選択" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>トラック</Label>
                <Select value={truckId || "_none"}
                  onValueChange={(v) => setTruckId(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="トラックを選択" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">（未選択）</SelectItem>
                    {trucks.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.vehicleNumber} ({t.vehicleName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>明細（{rows.length}行）</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />行を追加
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2 min-w-[160px]">得意先</th>
                  <th className="p-2 min-w-[140px]">発地</th>
                  <th className="p-2 min-w-[140px]">着地</th>
                  <th className="p-2 min-w-[160px]">着地の住所</th>
                  <th className="p-2 min-w-[120px]">品名</th>
                  <th className="p-2 w-20">数量</th>
                  <th className="p-2 w-24">給与</th>
                  <th className="p-2 w-24">運賃</th>
                  <th className="p-2 w-24">通行料</th>
                  <th className="p-2 w-24">距離手当</th>
                  <th className="p-2 min-w-[120px]">給与形態</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.uid} className="border-b align-top">
                    <td className="p-1">
                      <CustomerAutocomplete id={`cust-${r.uid}`} value={r.customerName}
                        onSelect={(id, name) => {
                          updateRow(r.uid, "customerId", id);
                          updateRow(r.uid, "customerName", name);
                        }}
                        placeholder="得意先" />
                    </td>
                    <td className="p-1">
                      <AutocompleteInput id={`origin-${r.uid}`} value={r.origin}
                        onChange={(v) => updateRow(r.uid, "origin", v)} field="origin" placeholder="発地" />
                    </td>
                    <td className="p-1">
                      <AutocompleteInput id={`dest-${r.uid}`} value={r.destination}
                        onChange={(v) => updateRow(r.uid, "destination", v)} field="destination" placeholder="着地" />
                    </td>
                    <td className="p-1">
                      <Input value={r.destinationAddress}
                        onChange={(e) => updateRow(r.uid, "destinationAddress", e.target.value)} placeholder="住所" />
                    </td>
                    <td className="p-1">
                      <Input value={r.productName}
                        onChange={(e) => updateRow(r.uid, "productName", e.target.value)} placeholder="品名" />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.quantity}
                        onChange={(e) => updateRow(r.uid, "quantity", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.salary}
                        onChange={(e) => updateRow(r.uid, "salary", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.fare}
                        onChange={(e) => updateRow(r.uid, "fare", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.tollFee}
                        onChange={(e) => updateRow(r.uid, "tollFee", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.distanceAllowance}
                        onChange={(e) => updateRow(r.uid, "distanceAllowance", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Select value={r.wageType || "_none"}
                        onValueChange={(v) => updateRow(r.uid, "wageType", v === "_none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="形態" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">（未選択）</SelectItem>
                          {wageTypes.map((wt) => (
                            <SelectItem key={wt} value={wt}>{wt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(r.uid)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "登録中..." : "まとめて登録"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/reports")}>
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: 成功

- [ ] **Step 3: Lint**

Run: `npm run lint`
Expected: 新規エラーなし

- [ ] **Step 4: コミット**

```bash
git add "src/app/(dashboard)/reports/batch/page.tsx"
git commit -m "feat: add batch daily report entry page"
```

---

## Task 9: 日報一覧に「まとめ入力」ボタンを追加

**Files:**
- Modify: `src/app/(dashboard)/reports/page.tsx:248-253`（新規登録ボタン付近）

- [ ] **Step 1: ヘッダーにまとめ入力ボタンを追加**

`src/app/(dashboard)/reports/page.tsx` の「新規登録」ボタン（248-253行）を、2つのボタンを並べる形に置き換える。

置換前:
```tsx
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Link>
        </Button>
```
置換後:
```tsx
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/reports/batch">
              <Plus className="mr-2 h-4 w-4" />
              まとめ入力
            </Link>
          </Button>
          <Button asChild>
            <Link href="/reports/new">
              <Plus className="mr-2 h-4 w-4" />
              新規登録
            </Link>
          </Button>
        </div>
```

- [ ] **Step 2: ビルド確認**

Run: `npm run build`
Expected: 成功

- [ ] **Step 3: コミット**

```bash
git add "src/app/(dashboard)/reports/page.tsx"
git commit -m "feat: add batch entry button to reports list"
```

---

## Task 10: 単件フォームと更新APIに「着地の住所」を追加

**Files:**
- Modify: `src/components/reports/report-form.tsx`
- Modify: `src/app/api/reports/route.ts`（POST）
- Modify: `src/app/api/reports/[id]/route.ts`（PUT）

- [ ] **Step 1: フォームの型・初期値に追加**

`src/components/reports/report-form.tsx` の `DailyReport` 型に `destination: string;` の後へ追加:
```tsx
  destinationAddress?: string | null;  // 着地の住所
```

`useState` の `formData` 初期値、`destination: report?.destination || "",` の後へ追加:
```tsx
    destinationAddress: report?.destinationAddress || "",
```

- [ ] **Step 2: フォームに入力欄を追加**

配送情報カード内、納品先(destination)の `AutocompleteInput` を含む `<div className="grid grid-cols-2 gap-4">...</div>` の直後に、着地の住所入力を追加:
```tsx
          <div className="space-y-2">
            <Label htmlFor="destinationAddress">着地の住所</Label>
            <Input
              id="destinationAddress"
              value={formData.destinationAddress}
              onChange={(e) =>
                setFormData({ ...formData, destinationAddress: e.target.value })
              }
              placeholder="例: 茨城県常総市○○ 1-2-3"
            />
          </div>
```

- [ ] **Step 3: POST APIで受け取り保存**

`src/app/api/reports/route.ts` の POST：分割代入（`const { ... } = body;`）に `destinationAddress,` を追加し、`tx.dailyReport.create` の `data` 内、`destination,` の後へ追加:
```ts
          destination,
          destinationAddress: destinationAddress || null,
```

- [ ] **Step 4: PUT APIで受け取り保存**

`src/app/api/reports/[id]/route.ts` の PUT：分割代入に `destinationAddress,` を追加し、`prisma.dailyReport.update` の `data` 内、`destination,` の後へ追加:
```ts
        destination,
        destinationAddress: destinationAddress || null,
```

- [ ] **Step 5: ビルド確認**

Run: `npm run build`
Expected: 成功

- [ ] **Step 6: Lint**

Run: `npm run lint`
Expected: 新規エラーなし

- [ ] **Step 7: コミット**

```bash
git add src/components/reports/report-form.tsx src/app/api/reports/route.ts "src/app/api/reports/[id]/route.ts"
git commit -m "feat: add destination address to single report form and APIs"
```

**手動確認（実機・フェーズC全体）:**
- まとめ入力で複数行を入力 → 登録 → 一覧に行数分、共通の日付・従業員で表示される。
- 同じ日に既存日報があっても reportNumber が連番で衝突しない。
- 単件の新規/編集フォームで「着地の住所」が保存・再表示される。
- 既存の給与自動計算（1件入力）が従来どおり動く。

---

## 全体の最終確認

- [ ] `npm run build` 成功
- [ ] `npm run lint` 新規エラーなし
- [ ] `npx tsx scripts/verify-billing-period.ts` で ALL PASS
- [ ] 3機能を実機で一通り確認（各フェーズの手動確認手順）
- [ ] `feature/track-3features` ブランチの内容をレビュー後、main へのマージ方針を相談
