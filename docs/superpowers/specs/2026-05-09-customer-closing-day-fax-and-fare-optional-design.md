# 発注元の締め日・FAX追加と日報運賃の任意化 設計書

作成日: 2026-05-09

## 背景と目的

運転日報システムの運用ヒアリングから、以下3点の改善要望を受領した。

1. 発注元（Customer）に「締め日」を設定したい
2. 発注元（Customer）に FAX番号 入力欄を追加したい
3. 日報（DailyReport）で「運賃」を入力しなくても登録できるようにしたい

本仕様は上記3点を実装するための設計をまとめる。

## スコープ

### スコープ内

- 発注元マスタへの `closingDay`（締め日）と `fax`（FAX番号）の追加
- 発注元 新規登録/編集 画面での入力UI追加
- 発注元 一覧画面での「締め日」列追加
- 日報の運賃を任意項目化（DB・API・フォーム・一覧表示・請求書作成への影響対応）

### スコープ外（今回はやらない）

- 締め日に応じた請求書作成時の対象期間自動絞り込み（将来検討）
- 既存発注元データの締め日・FAX 一括設定（必要に応じて手動で運用）
- 給与計算側の25日締め周りの変更

## 用語の前提

- **発注元（Customer）**: 運送業務の依頼元。`prisma/schema.prisma` の `model Customer`。
- **締め日（closingDay）**: 月のうちのどの日でその月の請求を締めるか。例：`"20"`、`"末"`。
- **運賃（fare）**: 日報1件あたりの売上金額（税抜）。

## 1. 発注元への「締め日」と「FAX番号」追加

### 1.1 DBスキーマ変更

`prisma/schema.prisma` の `model Customer` に以下2フィールドを追加する。

```prisma
model Customer {
  // ... 既存フィールド ...
  fax           String?  // 追加: FAX番号
  closingDay    String?  @map("closing_day")  // 追加: 締め日 ("1"〜"31" または "末")
  // ... 既存フィールド ...
}
```

**型の選択理由**: `closingDay` は文字列型で「末」を直接表現する。整数で月末を `99` のような魔法の数字にしないことで、DBを直接覗いた時の可読性を保つ。`null` は「未設定」を意味する。

### 1.2 マイグレーション

新規マイグレーション `20260509000000_add_customer_closing_day_and_fax` を生成する。

- 両フィールドとも NULL 許容で追加するため、既存データへの影響なし。
- ロールバックも安全（カラム削除のみ）。

### 1.3 API変更

#### `/api/customers/route.ts`

- POST: リクエストボディから `fax`, `closingDay` を受け取り、`null` 許容で保存。
- GET: そのまま全フィールドを返す（明示的な include 設定不要）。

#### `/api/customers/[id]/route.ts`

- PUT: 同様に `fax`, `closingDay` を受け取り更新。
- GET: そのまま全フィールドを返す。

### 1.4 画面変更

#### `/customers/new` および `/customers/[id]/edit`（`src/components/customers/customer-form.tsx`）

「電話番号／担当者」のグリッドの下に、新たなグリッドを追加する。

```
┌──────────────────┬──────────────────┐
│ FAX番号          │ 締め日           │
│ [____________]   │ [▼ 選択してください] │
└──────────────────┴──────────────────┘
```

- **FAX番号**: 通常の `<Input>` テキスト欄。プレースホルダー: `例: 03-1234-5678`。
- **締め日**: `<Select>`（shadcn/ui）。選択肢:
  - `（未設定）` （内部値 `_none`、保存時 `null`）
  - `1日` 〜 `31日` （内部値 `"1"`〜`"31"`、保存時そのまま）
  - `月末` （内部値 `"末"`、保存時 `"末"`）

`Customer` 型定義（フォーム内）にも `fax: string \| null` と `closingDay: string \| null` を追加する。

#### `/customers`（`src/app/(dashboard)/customers/page.tsx`）

一覧テーブルに「締め日」列を追加。表示形式:

| 値 | 表示 |
|---|---|
| `null` | `-` |
| `"末"` | `月末` |
| `"20"` | `20日` |

FAX は列が増えすぎる懸念から一覧では出さず、編集画面でのみ確認できる構成とする。

## 2. 日報の「運賃」を任意化

### 2.1 DBスキーマ変更

`prisma/schema.prisma` の `model DailyReport` の `fare` を NULL 許容に変更する。

```prisma
model DailyReport {
  // ...
  fare         Decimal?  @db.Decimal(12, 0)  // 変更: NOT NULL → NULL許容
  // ...
}
```

### 2.2 マイグレーション

新規マイグレーション `20260509010000_make_fare_optional` を生成する。

- NOT NULL → NULL 許容への変更は既存データを保持したまま安全に実行可能。
- 既存の数値データはそのまま残り、新規登録から NULL を許可する。

### 2.3 API変更

#### `/api/reports/route.ts`（POST）

```typescript
// 変更前
if (!reportDate || !employeeId || !customerId || !origin || !destination || fare === undefined) {
  return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
}
// ...
const parsedFare = safeParseInt(fare);
if (parsedFare === null) {
  return NextResponse.json({ error: "運賃は有効な数値を入力してください" }, { status: 400 });
}
// ...
fare: parsedFare,
```

```typescript
// 変更後
if (!reportDate || !employeeId || !customerId || !origin || !destination) {
  return NextResponse.json({ error: "必須項目を入力してください" }, { status: 400 });
}
// ...
// 空文字や undefined は NULL、数字なら数値変換
const parsedFare = (fare === "" || fare === null || fare === undefined) ? null : safeParseInt(fare);
// ...
fare: parsedFare,  // null も許容
```

#### `/api/reports/[id]/route.ts`（PUT）

同様の対応を行う。

### 2.4 画面変更

#### `/reports/new` および `/reports/[id]/edit`（`src/components/reports/report-form.tsx`）

```
変更前: <Label>運賃（税抜） <span className="text-destructive">*</span></Label>
変更後: <Label>運賃（税抜）</Label>

変更前: <Input id="fare" type="number" value={formData.fare} ... required />
変更後: <Input id="fare" type="number" value={formData.fare} ... />
```

赤い `*` マークと `required` 属性を削除する。

### 2.5 一覧画面（`/reports`）

#### 表示

| 値 | 表示 |
|---|---|
| `null` | `-` |
| 数値 | `¥50,000`（既存通り） |

#### 合計運賃の集計

```typescript
// 変更前
const fare = typeof r.fare === "string" ? parseInt(r.fare) : r.fare;
return sum + fare;

// 変更後
const fare = r.fare == null ? 0 : (typeof r.fare === "string" ? parseInt(r.fare) : r.fare);
return sum + fare;
```

NULL 運賃の日報は「0として扱って合計に含める」（実質、合計には影響しない）。

### 2.6 請求書作成（`/invoices/new`）

#### 日報候補の表示

| 値 | 表示 |
|---|---|
| `null` | `金額未確定` |
| 数値 | `¥50,000`（既存通り） |

#### NULL 運賃日報の選択時の挙動

選択された日報の運賃が `null` の場合、対応する明細行の `amount` 欄を **手動入力フィールドにフォールバック**する。

- 実装方針: 明細編集UIで、`amount` 欄を常に編集可能にする。日報選択時は `fare` を初期値として入れるが、NULL なら空欄スタートで手入力させる。
- 合計計算: 手入力された値を合算する。

## 3. 影響範囲のまとめ

### 3.1 変更ファイル

| ファイル | 変更内容 |
|---|---|
| `prisma/schema.prisma` | Customer に `fax`, `closingDay` 追加。DailyReport.fare を NULL 許容化。 |
| `prisma/migrations/20260509000000_add_customer_closing_day_and_fax/migration.sql` | 新規 |
| `prisma/migrations/20260509010000_make_fare_optional/migration.sql` | 新規 |
| `src/app/api/customers/route.ts` | POST で fax, closingDay を受領 |
| `src/app/api/customers/[id]/route.ts` | PUT で fax, closingDay を受領 |
| `src/app/api/reports/route.ts` | POST で fare 必須チェックを外す |
| `src/app/api/reports/[id]/route.ts` | PUT で fare 必須チェックを外す |
| `src/components/customers/customer-form.tsx` | FAX/締め日 入力欄追加 |
| `src/app/(dashboard)/customers/page.tsx` | 締め日列追加 |
| `src/components/reports/report-form.tsx` | 運賃の必須マーク・required削除 |
| `src/app/(dashboard)/reports/page.tsx` | 運賃 NULL の表示・集計対応 |
| `src/app/(dashboard)/invoices/new/page.tsx` | NULL 運賃の表示・手動入力フォールバック |

### 3.2 既存テストへの影響

- `e2e/` 配下のテストで運賃必須を前提としたケースがあれば、新規ケース（運賃空欄でも登録できる）を追加する。
- 既存テストの破壊はしない（運賃を入れているケースは変わらず通るはず）。

### 3.3 後方互換性

- 既存の運賃が入っている日報・既存の発注元データは一切変更しない。
- 新規追加カラムはデフォルト NULL なので、既存レコードへの影響なし。

## 4. 完了の定義

- [ ] 発注元 新規登録画面で FAX と締め日が入力でき、保存後に編集画面で再表示される
- [ ] 発注元 編集画面で FAX と締め日が編集でき、保存後に値が反映される
- [ ] 発注元 一覧画面で「締め日」列が表示される（未設定は `-`、`"末"` は `月末`）
- [ ] 日報 新規登録画面で運賃を空欄のまま「登録」ボタンを押し、登録が成功する
- [ ] 登録された運賃 NULL の日報が、日報一覧で運賃列が `-` で表示される
- [ ] 日報一覧の「合計運賃」が NULL 日報を 0 として扱い、エラーなく計算される
- [ ] 請求書作成画面で運賃 NULL の日報を選択した場合、金額欄を手入力できる
- [ ] 既存の運賃入りの日報・既存の発注元データは挙動が変わらない（リグレッションなし）

## 5. 将来の拡張（今回のスコープ外）

- 発注元の締め日に応じた、請求書作成時の対象期間自動絞り込み
- 締め日に基づく支払期限の自動計算（例：`月末締め翌月末払い`）
- FAX番号への送信機能（FAX API連携など）
