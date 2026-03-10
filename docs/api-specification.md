# 運送業基幹システム API仕様書

**バージョン**: 1.0
**最終更新日**: 2026-02-07
**フレームワーク**: Next.js (App Router) + Prisma + PostgreSQL
**認証方式**: NextAuth.js (JWT / Credentials Provider)

---

## 目次

1. [概要](#概要)
2. [認証 (Authentication)](#1-認証-authentication)
3. [ダッシュボード (Dashboard)](#2-ダッシュボード-dashboard)
4. [車両マスタ (Trucks)](#3-車両マスタ-trucks)
5. [従業員マスタ (Employees)](#4-従業員マスタ-employees)
6. [得意先マスタ (Customers)](#5-得意先マスタ-customers)
7. [日報 (Daily Reports)](#6-日報-daily-reports)
8. [請求書 (Invoices)](#7-請求書-invoices)
9. [給与 (Payrolls)](#8-給与-payrolls)
10. [賃率マスタ (Wage Rates)](#9-賃率マスタ-wage-rates)
11. [チェックリスト (Checklist)](#10-チェックリスト-checklist)
12. [設定 (Settings)](#11-設定-settings)
13. [ユーザー管理 (Users)](#12-ユーザー管理-users)
14. [データモデル関連図](#データモデル関連図)
15. [共通仕様](#共通仕様)

---

## 概要

本システムは運送業向けの基幹業務システムであり、以下の業務を管理する。

- 車両・従業員・得意先のマスタ管理
- 日報（運送実績）の記録・管理
- 請求書の作成・PDF生成・メール送信
- 給与明細の管理（25日締め）
- 賃率マスタの管理
- 確認事項（チェックリスト）の管理
- システム設定・ユーザー管理

### 基本URL

```
http://localhost:3000/api
```

### 認証方式

全API（認証エンドポイント自体を除く）は `requireAuth` によるセッション認証が必要。未認証の場合は `401` エラーが返される。認証はNextAuth.jsのJWTセッション戦略を使用し、セッションの有効期間は30日間。

### 共通エラーレスポンス

| ステータスコード | 意味 | レスポンスボディ |
|:---:|---|---|
| 401 | 未認証 | `{ "error": "認証が必要です" }` |
| 400 | バリデーションエラー | `{ "error": "（エラーメッセージ）" }` |
| 404 | リソース未検出 | `{ "error": "（対象）が見つかりません" }` |
| 500 | サーバーエラー | `{ "error": "（操作）に失敗しました" }` |

---

## 1. 認証 (Authentication)

### POST /api/auth/[...nextauth]

NextAuth.jsが提供する認証エンドポイント群。Credentials Providerを使用したメールアドレス・パスワード認証を行う。

**認証要否**: 不要（認証を行うためのエンドポイント）

#### 主要エンドポイント

| パス | 説明 |
|---|---|
| `POST /api/auth/callback/credentials` | ログイン認証 |
| `GET /api/auth/session` | セッション情報取得 |
| `POST /api/auth/signout` | ログアウト |
| `GET /api/auth/csrf` | CSRFトークン取得 |

#### ログインリクエスト（POST /api/auth/callback/credentials）

```json
{
  "email": "string (必須)",
  "password": "string (必須)"
}
```

#### 認証成功時のセッション情報

```json
{
  "user": {
    "id": "string (cuid)",
    "email": "string",
    "name": "string | null"
  },
  "expires": "string (ISO 8601)"
}
```

#### ビジネスロジック

- パスワードはbcryptでハッシュ化して保存されており、`bcrypt.compare` で照合する
- JWTトークンにユーザーIDを含める
- セッション有効期間: 30日
- ログインページ: `/login`

---

## 2. ダッシュボード (Dashboard)

### GET /api/dashboard/stats

ダッシュボード用の統計情報を取得する。

**認証要否**: 必須 (requireAuth)

#### リクエストパラメータ

なし

#### レスポンス (200 OK)

```json
{
  "truckCount": "number (有効な車両数)",
  "employeeCount": "number (有効な従業員数)",
  "customerCount": "number (有効な得意先数)",
  "monthlyReportCount": "number (当月の日報件数)",
  "recentReports": [
    {
      "id": "number",
      "reportNumber": "string",
      "reportDate": "string (ISO 8601)",
      "origin": "string",
      "destination": "string",
      "fare": "string (Decimal)",
      "employee": {
        "name": "string"
      },
      "customer": {
        "name": "string"
      }
    }
  ]
}
```

#### ビジネスロジック

- 車両・従業員・得意先はそれぞれ `isActive: true` の件数のみカウント
- 当月の日報件数は**25日締めの給与計算期間**で集計する（例: 1月15日時点の場合、12/26から1/25の期間）
- `getCurrentPayrollPeriod()` を使用して期間を動的に計算
- 最新5件の日報を従業員名・得意先名付きで取得

#### 関連エンドポイント

- `/api/trucks` (車両数の詳細)
- `/api/employees` (従業員数の詳細)
- `/api/customers` (得意先数の詳細)
- `/api/reports` (日報の詳細)

---

## 3. 車両マスタ (Trucks)

### GET /api/trucks

有効な車両一覧を取得する。

**認証要否**: 必須 (requireAuth)

#### リクエストパラメータ

なし

#### レスポンス (200 OK)

```json
[
  {
    "id": "number",
    "vehicleNumber": "string (車両番号)",
    "vehicleName": "string (車種名)",
    "memo": "string | null",
    "isActive": "boolean",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)",
    "employees": [
      {
        "id": "number (TruckEmployee.id)",
        "truckId": "number",
        "employeeId": "number",
        "createdAt": "string (ISO 8601)",
        "employee": {
          "id": "number",
          "name": "string",
          "nameKana": "string",
          "phone": "string | null",
          "memo": "string | null",
          "baseSalary": "string | null (Decimal)",
          "wageType": "string | null",
          "isActive": "boolean",
          "createdAt": "string (ISO 8601)",
          "updatedAt": "string (ISO 8601)"
        }
      }
    ]
  }
]
```

#### ビジネスロジック

- `isActive: true` の車両のみ取得
- 作成日時の降順でソート
- 紐付けられた従業員情報を含む

---

### POST /api/trucks

新規車両を登録する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| vehicleNumber | string | 必須 | 車両番号 |
| vehicleName | string | 必須 | 車種名 |
| memo | string | 任意 | メモ |
| employeeIds | number[] | 任意 | 紐付ける従業員IDの配列 |

#### レスポンス (201 Created)

作成された車両オブジェクト（employees含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 登録成功 |
| 400 | vehicleNumber または vehicleName が未指定 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### GET /api/trucks/[id]

指定IDの車両詳細を取得する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 車両ID |

#### レスポンス (200 OK)

車両オブジェクト（employees含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | IDが無効な値 |
| 404 | 車両が見つからない |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### PUT /api/trucks/[id]

指定IDの車両を更新する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 車両ID |

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| vehicleNumber | string | 必須 | 車両番号 |
| vehicleName | string | 必須 | 車種名 |
| memo | string | 任意 | メモ |
| employeeIds | number[] | 任意 | 紐付ける従業員IDの配列 |

#### ビジネスロジック

- 更新時、既存の車両-従業員紐付け（TruckEmployee）を全て削除した上で、新しい紐付けを作成する（洗い替え方式）

#### レスポンス (200 OK)

更新された車両オブジェクト（employees含む）

---

### DELETE /api/trucks/[id]

指定IDの車両を論理削除する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 車両ID |

#### ビジネスロジック

- **論理削除**: `isActive` を `false` に更新する（物理削除ではない）

#### レスポンス (200 OK)

```json
{
  "message": "トラックを削除しました"
}
```

---

## 4. 従業員マスタ (Employees)

### GET /api/employees

有効な従業員一覧を取得する。

**認証要否**: 必須 (requireAuth)

#### リクエストパラメータ

なし

#### レスポンス (200 OK)

```json
[
  {
    "id": "number",
    "name": "string",
    "nameKana": "string (フリガナ)",
    "phone": "string | null",
    "memo": "string | null",
    "baseSalary": "string | null (Decimal)",
    "wageType": "string | null (大型, 常用, 4t 等)",
    "isActive": "boolean",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)",
    "trucks": [
      {
        "id": "number (TruckEmployee.id)",
        "truckId": "number",
        "employeeId": "number",
        "createdAt": "string (ISO 8601)",
        "truck": {
          "id": "number",
          "vehicleNumber": "string",
          "vehicleName": "string",
          "memo": "string | null",
          "isActive": "boolean",
          "createdAt": "string (ISO 8601)",
          "updatedAt": "string (ISO 8601)"
        }
      }
    ]
  }
]
```

#### ビジネスロジック

- `isActive: true` の従業員のみ取得
- 作成日時の降順でソート
- 紐付けられた車両情報を含む

---

### POST /api/employees

新規従業員を登録する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| name | string | 必須 | 氏名 |
| nameKana | string | 必須 | フリガナ |
| phone | string | 任意 | 電話番号 |
| baseSalary | string/number | 任意 | 基本給（整数に変換して保存） |
| wageType | string | 任意 | 給与形態（大型, 常用, 4t 等） |
| memo | string | 任意 | メモ |
| truckIds | number[] | 任意 | 紐付ける車両IDの配列 |

#### レスポンス (201 Created)

作成された従業員オブジェクト（trucks含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 登録成功 |
| 400 | name または nameKana が未指定 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### GET /api/employees/[id]

指定IDの従業員詳細を取得する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 従業員ID |

#### レスポンス (200 OK)

従業員オブジェクト（trucks含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | IDが無効な値 |
| 404 | 従業員が見つからない |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### PUT /api/employees/[id]

指定IDの従業員を更新する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 従業員ID |

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| name | string | 必須 | 氏名 |
| nameKana | string | 必須 | フリガナ |
| phone | string | 任意 | 電話番号 |
| baseSalary | string/number | 任意 | 基本給 |
| wageType | string | 任意 | 給与形態 |
| memo | string | 任意 | メモ |
| truckIds | number[] | 任意 | 紐付ける車両IDの配列 |

#### ビジネスロジック

- 更新時、既存の車両-従業員紐付け（TruckEmployee）を全て削除した上で、新しい紐付けを作成する（洗い替え方式）

#### レスポンス (200 OK)

更新された従業員オブジェクト（trucks含む）

---

### DELETE /api/employees/[id]

指定IDの従業員を論理削除する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 従業員ID |

#### ビジネスロジック

- **論理削除**: `isActive` を `false` に更新する

#### レスポンス (200 OK)

```json
{
  "message": "従業員を削除しました"
}
```

---

## 5. 得意先マスタ (Customers)

### GET /api/customers

有効な得意先一覧を取得する。

**認証要否**: 必須 (requireAuth)

#### リクエストパラメータ

なし

#### レスポンス (200 OK)

```json
[
  {
    "id": "number",
    "name": "string",
    "address": "string | null",
    "phone": "string | null",
    "email": "string | null (請求書送付先メールアドレス)",
    "contactPerson": "string | null (担当者名)",
    "memo": "string | null",
    "isActive": "boolean",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
]
```

#### ビジネスロジック

- `isActive: true` の得意先のみ取得
- 名前の昇順でソート

---

### POST /api/customers

新規得意先を登録する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| name | string | 必須 | 得意先名 |
| address | string | 任意 | 住所 |
| phone | string | 任意 | 電話番号 |
| email | string | 任意 | 請求書送付先メールアドレス |
| contactPerson | string | 任意 | 担当者名 |
| memo | string | 任意 | メモ |

#### レスポンス (201 Created)

作成された得意先オブジェクト

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 登録成功 |
| 400 | name が未指定 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### GET /api/customers/[id]

指定IDの得意先詳細を取得する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 得意先ID |

#### レスポンス (200 OK)

得意先オブジェクト

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | IDが無効な値 |
| 404 | 得意先が見つからない |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### PUT /api/customers/[id]

指定IDの得意先を更新する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 得意先ID |

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| name | string | 必須 | 得意先名 |
| address | string | 任意 | 住所 |
| phone | string | 任意 | 電話番号 |
| email | string | 任意 | メールアドレス |
| contactPerson | string | 任意 | 担当者名 |
| memo | string | 任意 | メモ |

#### レスポンス (200 OK)

更新された得意先オブジェクト

---

### DELETE /api/customers/[id]

指定IDの得意先を論理削除する。

**認証要否**: 必須 (requireAuth)

#### ビジネスロジック

- **論理削除**: `isActive` を `false` に更新する

#### レスポンス (200 OK)

```json
{
  "message": "得意先を削除しました"
}
```

---

## 6. 日報 (Daily Reports)

### GET /api/reports

日報一覧を取得する。各種フィルタ条件に対応。

**認証要否**: 必須 (requireAuth)

#### クエリパラメータ

| パラメータ | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| year | number | 任意 | 対象年（monthとセットで使用） |
| month | number | 任意 | 対象月（yearとセットで使用） |
| startDate | string (ISO 8601) | 任意 | 開始日（year/monthが指定されていない場合に使用） |
| endDate | string (ISO 8601) | 任意 | 終了日（year/monthが指定されていない場合に使用） |
| employeeId | number | 任意 | 従業員ID |
| customerId | number | 任意 | 得意先ID |

#### ビジネスロジック

- year/monthが指定された場合、**25日締め期間**で絞り込む
  - 例: year=2025, month=1 の場合 → 2024/12/26 から 2025/1/25 の期間
  - `getPayrollPeriod()` 関数を使用して期間を計算
- year/monthが未指定でstartDate/endDateが指定された場合、その日付範囲で絞り込む
- employeeId, customerIdによるフィルタリングも可能（組み合わせ可）

#### レスポンス (200 OK)

```json
[
  {
    "id": "number",
    "reportNumber": "string (YYYYMMDD-XXX 形式)",
    "reportDate": "string (ISO 8601)",
    "reportType": "string | null (集計, チャーター等)",
    "employeeId": "number",
    "truckId": "number",
    "customerId": "number",
    "origin": "string (発地)",
    "destination": "string (着地)",
    "productName": "string | null (品名)",
    "quantity": "number | null (数量)",
    "tonnage": "string | null (Decimal, t数)",
    "fare": "string (Decimal, 運賃)",
    "salary": "string | null (Decimal, 給与)",
    "tollFee": "string (Decimal, 通行料)",
    "distanceAllowance": "string (Decimal, 距離手当)",
    "invoiceItemId": "number | null",
    "itemMemo": "string | null (明細備考)",
    "workItems": "string | null (JSON配列文字列)",
    "wageType": "string | null (給与形態)",
    "memo": "string | null",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)",
    "createdById": "string | null",
    "updatedById": "string | null",
    "employee": { "...Employee オブジェクト" },
    "truck": { "...Truck オブジェクト" },
    "customer": { "...Customer オブジェクト" }
  }
]
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### POST /api/reports

新規日報を登録する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| reportDate | string (ISO 8601) | 必須 | 日報日付 |
| reportType | string | 任意 | 日報種類（集計, チャーター等） |
| employeeId | number | 必須 | 従業員ID |
| truckId | number | 必須 | 車両ID |
| customerId | number | 必須 | 得意先ID |
| origin | string | 必須 | 発地 |
| destination | string | 必須 | 着地 |
| productName | string | 任意 | 品名 |
| fare | number | 必須 | 運賃 |
| salary | number | 任意 | 給与（ドライバーへの支払額） |
| tollFee | number | 任意 | 通行料（デフォルト: 0） |
| distanceAllowance | number | 任意 | 距離手当（デフォルト: 0） |
| workItems | string | 任意 | 作業項目（JSON配列文字列、例: `["基本給", "2回目"]`） |
| wageType | string | 任意 | 給与形態（大型, 常用, 4t等） |
| memo | string | 任意 | メモ |
| invoiceItemId | number | 任意 | 請求書明細ID（請求書から日報フロー用） |

#### ビジネスロジック

- **日報番号の自動採番**: `YYYYMMDD-XXX` 形式
  - 同一日付の最新番号を取得し、シーケンスを+1してゼロ埋め3桁
  - 例: `20250115-001`, `20250115-002`
  - トランザクション内で処理し、レースコンディションを防止
- createdByIdにログインユーザーのIDを記録

#### レスポンス (201 Created)

作成された日報オブジェクト（employee, truck, customer含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 登録成功 |
| 400 | 必須項目が未指定、またはID/運賃が無効な数値 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### GET /api/reports/[id]

指定IDの日報詳細を取得する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 日報ID |

#### レスポンス (200 OK)

日報オブジェクト（employee, truck, customer含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | IDが無効な値 |
| 404 | 日報が見つからない |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### PUT /api/reports/[id]

指定IDの日報を更新する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 日報ID |

#### リクエストボディ (JSON)

POST と同じフィールド（invoiceItemId を除く）。全て同じバリデーションルールが適用される。

#### ビジネスロジック

- updatedByIdにログインユーザーのIDを記録
- reportNumberは更新されない（作成時に一度だけ採番）

#### レスポンス (200 OK)

更新された日報オブジェクト（employee, truck, customer含む）

---

### DELETE /api/reports/[id]

指定IDの日報を物理削除する。

**認証要否**: 必須 (requireAuth)

#### ビジネスロジック

- **物理削除**（車両・従業員・得意先の論理削除とは異なる点に注意）

#### レスポンス (200 OK)

```json
{
  "message": "日報を削除しました"
}
```

---

### PATCH /api/reports/[id]/salary

指定IDの日報の給与フィールドのみを更新する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 日報ID |

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| salary | number/string/null | 必須 | 給与金額（null または空文字の場合はnullに設定） |

#### ビジネスロジック

- 給与フィールドのみの部分更新用エンドポイント
- updatedByIdにログインユーザーのIDを記録
- salary が null または空文字の場合、データベースにはnullとして保存

#### レスポンス (200 OK)

更新された日報オブジェクト（リレーション含まない）

---

### GET /api/reports/unbilled

指定得意先の未請求日報一覧を取得する。

**認証要否**: 必須 (requireAuth)

#### クエリパラメータ

| パラメータ | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| customerId | number | 必須 | 得意先ID |

#### ビジネスロジック

- 以下の両方の条件を満たす日報を「未請求」と判定する:
  1. `invoiceItems` リレーション（InvoiceItem.dailyReportId経由）にレコードがない
  2. `invoiceItemId`（DailyReport.invoiceItemId経由）がnull
- これは2つの請求フロー（日報から請求書フロー、請求書から日報フロー）の両方を考慮した判定

#### レスポンス (200 OK)

日報の配列（employee, truck, customer含む）。日付の昇順でソート。

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | customerIdが未指定または無効な値 |
| 401 | 未認証 |
| 500 | サーバーエラー |

#### 関連エンドポイント

- `POST /api/invoices` (取得した未請求日報から請求書を作成)

---

### GET /api/reports/by-employee

指定従業員の指定月の日報一覧と集計情報を取得する。

**認証要否**: 必須 (requireAuth)

#### クエリパラメータ

| パラメータ | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| employeeId | number | 必須 | 従業員ID |
| yearMonth | string | 必須 | 対象月（"YYYY-MM" 形式） |

#### ビジネスロジック

- **25日締め期間**で日報を絞り込む
  - 例: yearMonth="2025-01" の場合 → 2024/12/26 から 2025/1/25 の期間
- 運賃合計（totalFare）と給与合計（totalSalary）を計算
- Decimalオブジェクトの場合はNumber変換して集計

#### レスポンス (200 OK)

```json
{
  "reports": [
    {
      "id": "number",
      "reportNumber": "string",
      "reportDate": "string (ISO 8601)",
      "...その他の日報フィールド",
      "truck": { "...Truck オブジェクト" },
      "customer": { "...Customer オブジェクト" }
    }
  ],
  "summary": {
    "count": "number (日報件数)",
    "totalFare": "number (運賃合計)",
    "totalSalary": "number (給与合計)"
  }
}
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | employeeIdまたはyearMonthが未指定、またはemployeeIdが無効な数値 |
| 401 | 未認証 |
| 500 | サーバーエラー |

#### 関連エンドポイント

- `GET /api/payrolls` (給与明細と照合)
- `POST /api/payrolls` (給与明細作成時の参考データ)

---

### GET /api/reports/by-ids

指定した複数IDの日報を取得する。

**認証要否**: 必須 (requireAuth)

#### クエリパラメータ

| パラメータ | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| ids | string | 必須 | カンマ区切りの日報ID（例: "1,2,3"） |

#### ビジネスロジック

- カンマ区切りのID文字列をパースし、有効な整数のみを使用
- 有効なIDが0件の場合は空配列を返す
- リレーションは select で必要最小限のフィールドのみ取得

#### レスポンス (200 OK)

```json
[
  {
    "id": "number",
    "reportNumber": "string",
    "reportDate": "string (ISO 8601)",
    "...その他の日報フィールド",
    "employee": {
      "id": "number",
      "name": "string"
    },
    "truck": {
      "id": "number",
      "vehicleNumber": "string"
    },
    "customer": {
      "id": "number",
      "name": "string"
    }
  }
]
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | idsパラメータが未指定 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### GET /api/reports/suggestions

発地・着地のオートコンプリート候補を取得する。

**認証要否**: 必須 (requireAuth)

#### クエリパラメータ

| パラメータ | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| field | string | 必須 | `"origin"` または `"destination"` |
| query | string | 任意 | 検索文字列（部分一致、大文字小文字不問） |

#### ビジネスロジック

- 既存の日報データから、指定フィールドのユニークな値を取得
- query が指定されている場合、大文字小文字を区別しない部分一致でフィルタリング
- 最大50件まで取得
- フィールド値の昇順でソート

#### レスポンス (200 OK)

```json
["東京", "横浜", "大阪"]
```

文字列の配列を返す。

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | fieldが未指定、または "origin"/"destination" 以外の値 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

## 7. 請求書 (Invoices)

### GET /api/invoices

請求書一覧を取得する。

**認証要否**: 必須 (requireAuth)

#### クエリパラメータ

| パラメータ | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| customerId | number | 任意 | 得意先ID |
| status | string | 任意 | ステータス（"draft" または "issued"） |

#### レスポンス (200 OK)

```json
[
  {
    "id": "number",
    "invoiceNumber": "string (YYYYMM-XXX 形式)",
    "customerId": "number",
    "issueDate": "string (ISO 8601)",
    "subtotal": "string (Decimal, 小計)",
    "tax": "string (Decimal, 消費税)",
    "total": "string (Decimal, 合計)",
    "status": "string ('draft' | 'issued')",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)",
    "createdById": "string | null",
    "updatedById": "string | null",
    "customer": { "...Customer オブジェクト" },
    "items": [
      {
        "id": "number",
        "invoiceId": "number",
        "dailyReportId": "number | null",
        "itemDate": "string (ISO 8601)",
        "description": "string",
        "amount": "string (Decimal)",
        "tollFee": "string (Decimal)",
        "createdAt": "string (ISO 8601)",
        "dailyReport": { "...DailyReport オブジェクト | null" }
      }
    ]
  }
]
```

#### ビジネスロジック

- 作成日時の降順でソート
- 明細（items）と紐付いた日報（dailyReport）を含む

---

### POST /api/invoices

新規請求書を作成する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| customerId | number | 必須 | 得意先ID |
| issueDate | string (ISO 8601) | 必須 | 発行日 |
| items | array | 必須 | 明細の配列（1件以上必須） |

**items配列の各要素:**

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| dailyReportId | number | 任意 | 紐付ける日報ID |
| itemDate | string (ISO 8601) | 必須 | 明細日付 |
| description | string | 必須 | 明細説明 |
| amount | number | 必須 | 金額 |
| tollFee | number | 任意 | 通行料（デフォルト: 0） |

#### ビジネスロジック

- **請求書番号の自動採番**: `YYYYMM-XXX` 形式
  - 当月の最新番号を取得し、シーケンスを+1してゼロ埋め3桁
  - 例: `202501-001`, `202501-002`
  - トランザクション内で処理し、レースコンディションを防止
- **金額計算**:
  - `subtotal` = 全明細のamountの合計
  - `tax` = `Math.floor(subtotal * 0.1)` （消費税10%、端数切り捨て）
  - `total` = `subtotal + tax`
- 初期ステータスは `"draft"`
- createdByIdにログインユーザーのIDを記録

#### レスポンス (201 Created)

作成された請求書オブジェクト（customer, items含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 作成成功 |
| 400 | customerId, issueDate, items のいずれかが未指定、またはitemsが空配列、またはcustomerIdが無効 |
| 401 | 未認証 |
| 500 | サーバーエラー |

#### 関連エンドポイント

- `GET /api/reports/unbilled` (未請求日報の取得)
- `POST /api/invoices/[id]/issue` (発行ステータスへの変更)

---

### GET /api/invoices/[id]

指定IDの請求書詳細を取得する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 請求書ID |

#### レスポンス (200 OK)

請求書オブジェクト（customer, items含む）。itemsには以下のリレーションが含まれる:
- `dailyReport`: 日報から請求書フロー（InvoiceItem.dailyReportId経由）で紐付いた日報（employee, truck含む）
- `dailyReports`: 請求書から日報フロー（DailyReport.invoiceItemId経由）で紐付いた日報配列（employee, truck含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | IDが無効な値 |
| 404 | 請求書が見つからない |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### PUT /api/invoices/[id]

指定IDの請求書を更新する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 請求書ID |

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| issueDate | string (ISO 8601) | 必須 | 発行日 |
| status | string | 任意 | ステータス（デフォルト: "draft"） |
| items | array | 必須 | 明細の配列 |

**items配列の各要素:**

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| dailyReportId | number | 任意 | 紐付ける日報ID |
| itemDate | string (ISO 8601) | 任意 | 明細日付（未指定の場合はissueDateを使用） |
| description | string | 必須 | 明細説明 |
| amount | number | 必須 | 金額 |
| tollFee | number | 任意 | 通行料（デフォルト: 0） |

#### ビジネスロジック

- **洗い替え方式**: 既存の明細（InvoiceItem）を全て削除した上で、新しい明細を作成する
- **金額計算**:
  - `subtotal` = 全明細のamountの合計
  - `tax` = `Math.floor(subtotal * 0.1)` （消費税10%、端数切り捨て）
  - `total` = `subtotal + tax`
- updatedByIdにログインユーザーのIDを記録
- invoiceNumberは更新されない

#### レスポンス (200 OK)

更新された請求書オブジェクト（customer, items含む）

---

### DELETE /api/invoices/[id]

指定IDの請求書を物理削除する。

**認証要否**: 必須 (requireAuth)

#### ビジネスロジック

- **物理削除**: 明細（InvoiceItem）を先に削除し、その後請求書（Invoice）を削除する
- カスケード削除ではなく、明示的に2段階で削除

#### レスポンス (200 OK)

```json
{
  "message": "請求書を削除しました"
}
```

---

### POST /api/invoices/[id]/issue

指定IDの請求書を発行済みステータスに変更する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 請求書ID |

#### リクエストボディ

なし

#### ビジネスロジック

- statusを `"issued"` に更新する
- 一方通行の操作（issueからdraftへの戻しは本エンドポイントでは未対応だが、PUT /api/invoices/[id] でstatusを"draft"に設定することで可能）

#### レスポンス (200 OK)

更新された請求書オブジェクト（customer, items含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 発行成功 |
| 400 | IDが無効な値 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### GET /api/invoices/[id]/pdf

指定IDの請求書のPDFを生成してダウンロードする。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 請求書ID |

#### レスポンス (200 OK)

**Content-Type**: `application/pdf`
**Content-Disposition**: `attachment; filename="invoice-{invoiceNumber}.pdf"`

バイナリのPDFデータ

#### ビジネスロジック

- `@react-pdf/renderer` を使用してPDFを生成
- A4横向き（landscape）レイアウト
- NotoSansJPフォントを使用（Google Fontsから動的に読み込み）
- PDF内容:
  - ヘッダー: 請求書番号、「請求明細書」タイトル、発行日
  - 得意先情報: 住所、名称（「御中」付き）
  - 会社情報: 会社名、住所、電話番号、FAX、振込口座情報
  - サマリーテーブル: 当月売上額、通行料合計、消費税額、当月分請求額
  - インボイス登録番号
  - 明細テーブル: 月日、発地名、着地名、品名、金額
  - 空行の自動補填（最低10行）
  - 税区分サマリー: 10%対象金額、消費税額、小計、合計
- 通行料の計算は複数ソースを合算:
  1. `dailyReport.tollFee` (日報からの通行料)
  2. `invoiceItem.tollFee` (手動入力の通行料)
  3. `dailyReports[].tollFee` (請求書から日報フローの通行料合計)
- 会社設定（companyName, companyZipcode等）はSettingsテーブルから取得

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | PDF生成成功 |
| 400 | IDが無効な値 |
| 404 | 請求書が見つからない |
| 401 | 未認証 |
| 500 | PDF生成失敗 |

#### 関連エンドポイント

- `GET /api/settings` (会社情報の設定)
- `POST /api/invoices/[id]/send-email` (PDFをメールで送信)

---

### POST /api/invoices/[id]/send-email

指定IDの請求書をPDF添付でメール送信する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 請求書ID |

#### リクエストボディ

なし

#### ビジネスロジック

- 得意先のemailフィールドが登録されていることが前提条件
- PDFを動的に生成し、メールに添付して送信
- SMTP設定はSettingsテーブル（またはフォールバックとして環境変数 GMAIL_USER, GMAIL_APP_PASSWORD）から取得
- メール内容:
  - 件名: `【請求書】{invoiceNumber} - {年}年{月}月分`
  - 本文（HTML）: 得意先名、請求書番号、発行日、請求金額を含む定型文
  - 添付ファイル: `請求書_{invoiceNumber}.pdf`
- nodemailerを使用してSMTP送信

#### レスポンス (200 OK)

```json
{
  "message": "請求書を {メールアドレス} に送信しました"
}
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 送信成功 |
| 400 | IDが無効な値、または得意先のメールアドレスが未登録 |
| 404 | 請求書が見つからない |
| 401 | 未認証 |
| 500 | メール送信失敗（SMTP設定不備含む） |

#### 関連エンドポイント

- `POST /api/settings` (SMTP設定の登録)
- `GET /api/invoices/[id]/pdf` (PDFのみダウンロード)

---

## 8. 給与 (Payrolls)

### GET /api/payrolls

給与明細一覧を取得する。日報からの給与合計も計算して返す。

**認証要否**: 必須 (requireAuth)

#### クエリパラメータ

| パラメータ | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| employeeId | number | 任意 | 従業員ID |
| yearMonth | string | 任意 | 対象月（"YYYY-MM" 形式） |

#### ビジネスロジック

- 年月の降順 → 従業員名の昇順でソート
- 各給与明細に対して、対応する給与計算期間（25日締め）の日報を別途取得し、以下を計算:
  - `totalSalary`: 日報のsalaryフィールドの合計
  - `actualGrossPay`: `grossPay + totalSalary`（基本給与 + 日報給与合計）
  - `actualNetPay`: `actualGrossPay - totalDeduction`（実際の手取り）

#### レスポンス (200 OK)

```json
[
  {
    "id": "number",
    "employeeId": "number",
    "yearMonth": "string (YYYY-MM)",
    "baseSalary": "string (Decimal, 基本給)",
    "allowances": "object (JSON, 手当)",
    "deductions": "object (JSON, 控除)",
    "grossPay": "string (Decimal, 総支給額)",
    "totalDeduction": "string (Decimal, 控除合計)",
    "netPay": "string (Decimal, 差引支給額)",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)",
    "createdById": "string | null",
    "updatedById": "string | null",
    "employee": { "...Employee オブジェクト" },
    "totalSalary": "number (日報給与合計)",
    "actualGrossPay": "number (実際の総支給額)",
    "actualNetPay": "number (実際の手取り額)"
  }
]
```

#### 給与計算の補足

- `grossPay` = `baseSalary` + 各手当の合計（Payrollレコード作成時に計算）
- `totalSalary` = 同一従業員・同一期間の日報のsalaryフィールド合計（取得時に動的計算）
- `actualGrossPay` = `grossPay` + `totalSalary`
- `actualNetPay` = `actualGrossPay` - `totalDeduction`

---

### POST /api/payrolls

新規給与明細を作成する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| employeeId | number | 必須 | 従業員ID |
| yearMonth | string | 必須 | 対象月（"YYYY-MM" 形式） |
| baseSalary | number/string | 任意 | 基本給（デフォルト: 0） |
| allowances | object | 任意 | 手当（キー: 手当名, 値: 金額）。デフォルト: {} |
| deductions | object | 任意 | 控除（キー: 控除名, 値: 金額）。デフォルト: {} |

**allowances/deductions の例:**

```json
{
  "allowances": {
    "通勤手当": "10000",
    "残業手当": "25000"
  },
  "deductions": {
    "健康保険": "15000",
    "厚生年金": "20000",
    "所得税": "8000"
  }
}
```

#### ビジネスロジック

- **重複チェック**: 同一従業員・同一月の給与明細が既に存在する場合は400エラー
- **金額計算**:
  - `allowanceTotal` = allowancesの全値の合計
  - `deductionTotal` = deductionsの全値の合計
  - `grossPay` = `baseSalary` + `allowanceTotal`
  - `netPay` = `grossPay` - `deductionTotal`
- createdByIdにログインユーザーのIDを記録

#### レスポンス (201 Created)

作成された給与明細オブジェクト（employee含む）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 作成成功 |
| 400 | employeeIdまたはyearMonthが未指定、employeeIdが無効、または重複あり |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### GET /api/payrolls/[id]

指定IDの給与明細詳細を取得する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 給与明細ID |

#### レスポンス (200 OK)

給与明細オブジェクト（employee含む）

注意: このエンドポイントでは `totalSalary`, `actualGrossPay`, `actualNetPay` は計算されない（一覧取得のGET /api/payrollsでのみ計算される）

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 取得成功 |
| 400 | IDが無効な値 |
| 404 | 給与明細が見つからない |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### PUT /api/payrolls/[id]

指定IDの給与明細を更新する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 給与明細ID |

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| baseSalary | number/string | 任意 | 基本給 |
| allowances | object | 任意 | 手当 |
| deductions | object | 任意 | 控除 |

#### ビジネスロジック

- employeeId、yearMonthは更新不可（PUTのリクエストボディに含まれていない）
- 金額計算はPOSTと同じロジック
- updatedByIdにログインユーザーのIDを記録

#### レスポンス (200 OK)

更新された給与明細オブジェクト（employee含む）

---

### DELETE /api/payrolls/[id]

指定IDの給与明細を物理削除する。

**認証要否**: 必須 (requireAuth)

#### ビジネスロジック

- 削除前に存在確認を行い、見つからない場合は404を返す
- **物理削除**

#### レスポンス (200 OK)

```json
{
  "message": "給料明細を削除しました"
}
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 削除成功 |
| 400 | IDが無効な値 |
| 404 | 給与明細が見つからない |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

## 9. 賃率マスタ (Wage Rates)

### GET /api/wage-rates

賃率マスタの一覧を取得する。

**認証要否**: 必須 (requireAuth)

#### クエリパラメータ

| パラメータ | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| wageType | string | 任意 | 給与形態でフィルタ（例: "大型", "常用", "4t"） |

#### レスポンス (200 OK)

```json
[
  {
    "id": "number",
    "wageType": "string (大型, 常用, 4t, フォーク作業, ライトバン等)",
    "workItem": "string (基本給, 2回目, 有給, 引取り, 移動等)",
    "rate": "string (Decimal, 単価)",
    "sortOrder": "number (表示順)",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)"
  }
]
```

#### ビジネスロジック

- wageType昇順 → sortOrder昇順でソート
- wageTypeが指定された場合、そのタイプのみに絞り込む

---

### POST /api/wage-rates

賃率を登録または更新する（Upsert）。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| wageType | string | 必須 | 給与形態 |
| workItem | string | 必須 | 作業項目 |
| rate | number/string | 必須 | 単価 |
| sortOrder | number/string | 任意 | 表示順（デフォルト: 0） |

#### ビジネスロジック

- **Upsert**: wageType + workItem のユニーク制約に基づき、既存データがあれば更新、なければ新規作成
- rateは整数としてパースされる

#### レスポンス (201 Created)

作成/更新された賃率オブジェクト

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 登録/更新成功 |
| 400 | wageType, workItem, rate のいずれかが未指定、またはrateが無効な数値 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### DELETE /api/wage-rates

賃率を削除する。

**認証要否**: 必須 (requireAuth)

#### クエリパラメータ（以下のいずれかを指定）

**パターン1: IDで削除**

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | 賃率ID |

**パターン2: wageType + workItem で削除**

| パラメータ | 型 | 説明 |
|---|---|---|
| wageType | string | 給与形態 |
| workItem | string | 作業項目 |

#### ビジネスロジック

- IDが指定されている場合はIDで削除
- IDがなく wageType + workItem が指定されている場合はユニーク制約で検索して削除
- いずれも指定されていない場合は400エラー

#### レスポンス (200 OK)

```json
{
  "message": "単価を削除しました"
}
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 削除成功 |
| 400 | 削除条件が不足、またはIDが無効 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### POST /api/wage-rates/bulk

賃率を一括登録する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| wageRates | array | 必須 | 賃率データの配列（1件以上必須） |

**wageRates配列の各要素:**

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| wageType | string | 必須 | 給与形態 |
| workItem | string | 必須 | 作業項目 |
| rate | number/string | 必須 | 単価 |
| sortOrder | number/string | 任意 | 表示順（デフォルト: 0） |

#### ビジネスロジック

- **トランザクション処理**: 全件をPrismaの `$transaction` で一括Upsert
- 各要素は wageType + workItem のユニーク制約に基づくUpsert
- rateが無効な値の場合はトランザクション全体がロールバック

#### レスポンス (201 Created)

```json
{
  "message": "{N}件の単価を登録しました",
  "count": "number"
}
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 一括登録成功 |
| 400 | wageRatesが未指定、空配列、または配列でない |
| 401 | 未認証 |
| 500 | サーバーエラー（無効なrate値によるロールバック含む） |

---

## 10. チェックリスト (Checklist)

### GET /api/checklist

チェックリスト（確認事項）一覧を取得する。

**認証要否**: 必須 (requireAuth)

#### リクエストパラメータ

なし

#### レスポンス (200 OK)

```json
[
  {
    "id": "number",
    "title": "string",
    "description": "string | null",
    "isCompleted": "boolean",
    "dueDate": "string | null (ISO 8601)",
    "priority": "string ('low' | 'medium' | 'high')",
    "createdAt": "string (ISO 8601)",
    "updatedAt": "string (ISO 8601)",
    "createdById": "string | null",
    "updatedById": "string | null"
  }
]
```

#### ビジネスロジック

- ソート順:
  1. 未完了を先に（isCompleted昇順）
  2. 優先度の高い順（priority降順）
  3. 期限の近い順（dueDate昇順）
  4. 作成日時の新しい順（createdAt降順）

---

### POST /api/checklist

新規チェックリスト項目を登録する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| title | string | 必須 | タイトル |
| description | string | 任意 | 説明 |
| dueDate | string (ISO 8601) | 任意 | 期限日 |
| priority | string | 任意 | 優先度（"low", "medium", "high"）。デフォルト: "medium" |

#### レスポンス (201 Created)

作成されたチェックリスト項目オブジェクト

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 登録成功 |
| 400 | titleが未指定 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### PUT /api/checklist/[id]

指定IDのチェックリスト項目を更新する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | number | チェックリスト項目ID |

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| title | string | 任意 | タイトル |
| description | string | 任意 | 説明 |
| isCompleted | boolean | 任意 | 完了状態 |
| dueDate | string/null | 任意 | 期限日 |
| priority | string | 任意 | 優先度 |

#### ビジネスロジック

- **部分更新対応**: undefinedでないフィールドのみ更新する（スプレッド演算子とundefinedチェック）
- updatedByIdにログインユーザーのIDを記録

#### レスポンス (200 OK)

更新されたチェックリスト項目オブジェクト

---

### DELETE /api/checklist/[id]

指定IDのチェックリスト項目を物理削除する。

**認証要否**: 必須 (requireAuth)

#### ビジネスロジック

- **物理削除**

#### レスポンス (200 OK)

```json
{
  "message": "確認事項を削除しました"
}
```

---

## 11. 設定 (Settings)

### GET /api/settings

全設定をキー・バリュー形式で取得する。

**認証要否**: 必須 (requireAuth)

#### リクエストパラメータ

なし

#### レスポンス (200 OK)

```json
{
  "companyName": "string",
  "companyZipcode": "string",
  "companyAddress": "string",
  "companyPhone": "string",
  "companyFax": "string",
  "invoiceRegistrationNumber": "string",
  "bankName": "string",
  "bankBranch": "string",
  "bankAccountType": "string",
  "bankAccountNumber": "string",
  "smtpHost": "string",
  "smtpPort": "string",
  "smtpSecure": "string ('true' | 'false')",
  "smtpUser": "string",
  "smtpPassword": "string",
  "smtpFromEmail": "string",
  "smtpFromName": "string"
}
```

注意: 設定が存在しないキーはレスポンスに含まれない。レスポンスはSettingsテーブルに保存されている全キー・バリューを含む動的なオブジェクト。

#### ビジネスロジック

- Settingsテーブルのレコードをキーバリューオブジェクトに変換して返す

---

### POST /api/settings

設定を一括更新する（Upsert）。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

任意のキー・バリューペアを含むオブジェクト。各値はString型に変換して保存される。

```json
{
  "companyName": "株式会社○○運輸",
  "companyPhone": "03-1234-5678",
  "smtpHost": "smtp.gmail.com",
  "smtpPort": "587"
}
```

#### ビジネスロジック

- リクエストボディの各キー・バリューペアに対して、Settingsテーブルに対するUpsertを実行
- 既存のキーがあれば値を更新、なければ新規作成
- 全てのUpsertは `Promise.all` で並列実行

#### レスポンス (200 OK)

```json
{
  "success": true
}
```

---

### POST /api/settings/test-email

テストメールを送信する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| to | string | 必須 | 送信先メールアドレス |

#### ビジネスロジック

- メールアドレスの簡易バリデーション: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- `sendTestEmail()` 関数を呼び出し:
  - SMTP設定をSettingsテーブルから取得
  - フォールバック: 環境変数 `GMAIL_USER`, `GMAIL_APP_PASSWORD`
  - テスト用の定型メールを送信

#### レスポンス (200 OK)

```json
{
  "message": "テストメールを {メールアドレス} に送信しました"
}
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 送信成功 |
| 400 | toが未指定、またはメールアドレスの形式が不正 |
| 401 | 未認証 |
| 500 | メール送信失敗（SMTP設定不備含む） |

---

## 12. ユーザー管理 (Users)

### GET /api/users

ユーザー一覧を取得する。

**認証要否**: 必須 (requireAuth)

#### リクエストパラメータ

なし

#### レスポンス (200 OK)

```json
[
  {
    "id": "string (cuid)",
    "email": "string",
    "name": "string | null",
    "createdAt": "string (ISO 8601)"
  }
]
```

注意: passwordフィールドはselectで除外されており、レスポンスには含まれない。

#### ビジネスロジック

- 作成日時の降順でソート

---

### POST /api/users

新規ユーザーを登録する。

**認証要否**: 必須 (requireAuth)

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| email | string | 必須 | メールアドレス |
| password | string | 必須 | パスワード |
| name | string | 任意 | ユーザー名 |

#### ビジネスロジック

- **メール重複チェック**: 同一メールアドレスのユーザーが既に存在する場合は400エラー
- パスワードはbcryptでハッシュ化（ソルトラウンド: 10）して保存
- レスポンスにpasswordフィールドは含まない

#### レスポンス (201 Created)

```json
{
  "id": "string (cuid)",
  "email": "string",
  "name": "string | null",
  "createdAt": "string (ISO 8601)"
}
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 201 | 登録成功 |
| 400 | emailまたはpasswordが未指定、またはメールアドレスが重複 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

### PUT /api/users/[id]

指定IDのユーザーを更新する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | string (cuid) | ユーザーID |

#### リクエストボディ (JSON)

| フィールド | 型 | 必須/任意 | 説明 |
|---|---|:---:|---|
| email | string | 任意 | メールアドレス |
| name | string | 任意 | ユーザー名 |
| password | string | 任意 | パスワード（指定した場合のみ更新） |

#### ビジネスロジック

- **メール重複チェック**: 変更後のメールアドレスが他のユーザーで既に使用されている場合は400エラー（自身を除く）
- passwordが指定された場合のみbcryptでハッシュ化して更新
- 指定されたフィールドのみ更新（部分更新対応）
- レスポンスにpasswordフィールドは含まない

#### レスポンス (200 OK)

```json
{
  "id": "string (cuid)",
  "email": "string",
  "name": "string | null",
  "createdAt": "string (ISO 8601)"
}
```

---

### DELETE /api/users/[id]

指定IDのユーザーを物理削除する。

**認証要否**: 必須 (requireAuth)

#### パスパラメータ

| パラメータ | 型 | 説明 |
|---|---|---|
| id | string (cuid) | ユーザーID |

#### ビジネスロジック

- **最終ユーザー保護**: ユーザーが1人しかいない場合は削除不可（400エラー）
- **物理削除**
- 関連するDailyReport, Invoice, Payroll, ChecklistItemのcreatedById/updatedByIdは `onDelete: SetNull` により自動的にnullに設定される

#### レスポンス (200 OK)

```json
{
  "message": "ユーザーを削除しました"
}
```

#### ステータスコード

| コード | 条件 |
|:---:|---|
| 200 | 削除成功 |
| 400 | 最後のユーザーを削除しようとした場合 |
| 401 | 未認証 |
| 500 | サーバーエラー |

---

## データモデル関連図

### ER図（テキスト形式）

```
+-------------+       +------------------+       +-------------+
|    User      |       |  TruckEmployee   |       |    Truck     |
|-------------|       |------------------|       |-------------|
| id (PK)     |       | id (PK)          |       | id (PK)     |
| email       |       | truckId (FK)  ---|------>| vehicleNum  |
| name        |       | employeeId (FK)--|--+    | vehicleName |
| password    |       | createdAt        |  |    | memo        |
| createdAt   |       +------------------+  |    | isActive    |
| updatedAt   |                             |    | createdAt   |
+------+------+                             |    | updatedAt   |
       |                                    |    +------+------+
       | createdBy / updatedBy              |           |
       | (onDelete: SetNull)                |           |
       v                                    |           |
+------+------+                             |           |
|  DailyReport |<---------------------------+           |
|-------------|                                         |
| id (PK)     |<----------------------------------------+
| reportNumber|              truckId (FK)
| reportDate  |
| reportType  |       +-------------+
| employeeId  |------>|  Employee    |
| truckId     |       |-------------|
| customerId  |--+    | id (PK)     |
| origin      |  |    | name        |
| destination |  |    | nameKana    |
| productName |  |    | phone       |
| quantity    |  |    | baseSalary  |
| tonnage     |  |    | wageType    |
| fare        |  |    | memo        |
| salary      |  |    | isActive    |
| tollFee     |  |    | createdAt   |
| distanceAll.|  |    | updatedAt   |
| invoiceItemId  |    +------+------+
| itemMemo    |  |           |
| workItems   |  |           |
| wageType    |  |           v
| memo        |  |    +-------------+
| createdAt   |  |    |   Payroll    |
| updatedAt   |  |    |-------------|
| createdById |  |    | id (PK)     |
| updatedById |  |    | employeeId  |
+------+------+  |    | yearMonth   |
       |         |    | baseSalary  |
       |         |    | allowances  |
       |         |    | deductions  |
       |         |    | grossPay    |
       |         |    | totalDeduc. |
       |         |    | netPay      |
       |         |    | createdAt   |
       |         |    | updatedAt   |
       |         |    | createdById |
       |         |    | updatedById |
       |         |    +-------------+
       |         |
       |         |    +-------------+
       |         +--->|  Customer    |
       |              |-------------|
       |              | id (PK)     |
       |              | name        |
       |              | address     |
       |              | phone       |
       |              | email       |
       |              | contactPer. |
       |              | memo        |
       |              | isActive    |
       |              | createdAt   |
       |              | updatedAt   |
       |              +------+------+
       |                     |
       v                     v
+------+------+       +------+------+
| InvoiceItem  |       |   Invoice    |
|-------------|       |-------------|
| id (PK)     |       | id (PK)     |
| invoiceId   |------>| invoiceNum  |
| dailyRptId  |       | customerId  |
| itemDate    |       | issueDate   |
| description |       | subtotal    |
| amount      |       | tax         |
| tollFee     |       | total       |
| createdAt   |       | status      |
+-------------+       | createdAt   |
                       | updatedAt   |
                       | createdById |
                       | updatedById |
                       +-------------+
```

### リレーション一覧

| テーブル | リレーション | 型 | 説明 |
|---|---|---|---|
| User -> DailyReport | createdBy / updatedBy | 1:N | 日報の作成者・更新者（SetNull） |
| User -> Invoice | createdBy / updatedBy | 1:N | 請求書の作成者・更新者（SetNull） |
| User -> Payroll | createdBy / updatedBy | 1:N | 給与明細の作成者・更新者（SetNull） |
| User -> ChecklistItem | createdBy / updatedBy | 1:N | チェックリストの作成者・更新者（SetNull） |
| Truck <-> Employee | TruckEmployee (中間テーブル) | N:M | 車両と従業員の多対多関係（Cascade） |
| Truck -> DailyReport | dailyReports | 1:N | 車両ごとの日報 |
| Employee -> DailyReport | dailyReports | 1:N | 従業員ごとの日報 |
| Employee -> Payroll | payrolls | 1:N | 従業員ごとの給与明細 |
| Customer -> DailyReport | dailyReports | 1:N | 得意先ごとの日報 |
| Customer -> Invoice | invoices | 1:N | 得意先ごとの請求書 |
| Invoice -> InvoiceItem | items | 1:N | 請求書の明細（Cascade） |
| DailyReport <-> InvoiceItem | dailyReportId | 1:1 | 日報から請求書フロー |
| DailyReport -> InvoiceItem | invoiceItemId | N:1 | 請求書から日報フロー |

### 2つの請求フロー

本システムには日報と請求書を紐付ける2つのフローがある:

**フロー1: 日報から請求書を作成**
- `InvoiceItem.dailyReportId` で紐付け
- 未請求の日報を選択して請求書を作成する
- InvoiceItem 1件に対して DailyReport 1件

**フロー2: 請求書から日報を紐付け**
- `DailyReport.invoiceItemId` で紐付け
- 請求書明細に対して既存の日報を紐付ける
- InvoiceItem 1件に対して DailyReport N件

### ユニーク制約

| テーブル | フィールド | 説明 |
|---|---|---|
| User | email | メールアドレスのユニーク |
| DailyReport | reportNumber | 日報番号のユニーク |
| Invoice | invoiceNumber | 請求書番号のユニーク |
| TruckEmployee | [truckId, employeeId] | 車両-従業員の組み合わせのユニーク |
| Payroll | [employeeId, yearMonth] | 従業員-月の組み合わせのユニーク |
| WageRate | [wageType, workItem] | 給与形態-作業項目の組み合わせのユニーク |

---

## 共通仕様

### 給与計算期間（25日締め）

本システムは25日締めの給与計算期間を採用している。

| 表記 | 実際の期間 |
|---|---|
| 1月分 | 前年12月26日 から 1月25日 |
| 2月分 | 1月26日 から 2月25日 |
| 3月分 | 2月26日 から 3月25日 |
| ... | ... |
| 12月分 | 11月26日 から 12月25日 |

日付判定ルール:
- 1日から25日 → その月の給与期間に属する
- 26日から月末 → 翌月の給与期間に属する

関連関数（`/src/lib/payroll-period.ts`）:
- `getPayrollPeriod(yearMonth)`: 指定年月の給与期間を取得
- `getCurrentPayrollYearMonth(date?)`: 指定日が属する給与年月を取得
- `getCurrentPayrollPeriod(date?)`: 現在の給与期間を取得
- `formatYearMonth(yearMonth)`: "2024年1月" 形式にフォーマット
- `formatYearMonthWithPeriod(yearMonth)`: "2024年1月分 (12/26 から 1/25)" 形式にフォーマット

### 消費税計算

- 税率: 10%（固定）
- 計算式: `tax = Math.floor(subtotal * 0.1)`
- 端数処理: 切り捨て（floor）
- 合計: `total = subtotal + tax`

### 番号採番ルール

**日報番号**: `YYYYMMDD-XXX`
- YYYYMMDD: 日報日付
- XXX: 同一日付内の連番（ゼロ埋め3桁）
- 例: `20250115-001`, `20250115-002`

**請求書番号**: `YYYYMM-XXX`
- YYYYMM: 作成時の年月（請求書作成日時基準）
- XXX: 同一月内の連番（ゼロ埋め3桁）
- 例: `202501-001`, `202501-002`

### 削除方式

| エンティティ | 削除方式 | 説明 |
|---|---|---|
| Truck | 論理削除 | isActive を false に更新 |
| Employee | 論理削除 | isActive を false に更新 |
| Customer | 論理削除 | isActive を false に更新 |
| DailyReport | 物理削除 | レコードを直接削除 |
| Invoice | 物理削除 | 明細を先に削除後、本体を削除 |
| InvoiceItem | 物理削除 | Cascade削除（親のInvoice削除時） |
| Payroll | 物理削除 | レコードを直接削除 |
| ChecklistItem | 物理削除 | レコードを直接削除 |
| WageRate | 物理削除 | レコードを直接削除 |
| User | 物理削除 | 最終ユーザー保護あり |
| Setting | -- | 削除APIなし（Upsertのみ） |

### 認証ヘルパー関数（`/src/lib/api-auth.ts`）

| 関数 | 引数 | 戻り値 | 説明 |
|---|---|---|---|
| `requireAuth()` | なし | `{ session, error: null }` or `{ session: null, error: NextResponse }` | セッション検証。未認証時は401レスポンスを返す |
| `safeParseInt(value)` | `string \| null \| undefined` | `number \| null` | 安全な整数パース。NaN時はnullを返す |
| `requireInt(value, fieldName)` | `string \| null \| undefined`, `string` | `{ value: number, error: null }` or `{ value: null, error: NextResponse }` | 必須の整数パース。失敗時は400レスポンスを返す |

### SMTP設定

メール送信に使用するSMTP設定は以下の優先順位で取得される:

1. Settingsテーブルの設定値（`smtpHost`, `smtpPort`, `smtpSecure`, `smtpUser`, `smtpPassword`, `smtpFromEmail`, `smtpFromName`）
2. 環境変数 `GMAIL_USER`, `GMAIL_APP_PASSWORD`（Settingsが未設定の場合のフォールバック）
3. ホストが未設定で `GMAIL_USER` がある場合、自動的に `smtp.gmail.com` を使用

### PDF生成仕様（`/src/lib/invoice-pdf.tsx`）

- ライブラリ: `@react-pdf/renderer`
- フォント: NotoSansJP（Google Fontsから動的読み込み）
- ページサイズ: A4 横向き（landscape）
- PDF構成:
  - ヘッダー（請求書番号、タイトル、発行日）
  - 得意先情報（住所、名称）
  - 会社情報（会社名、住所、電話、FAX、振込口座）
  - サマリーテーブル（売上額、通行料、消費税、請求額）
  - インボイス登録番号
  - 明細テーブル（月日、発地、着地、品名、金額）。最低10行表示（空行で補填）
  - 税区分サマリー（10%対象金額、消費税額、小計、合計）

---

## API一覧（クイックリファレンス）

| カテゴリ | メソッド | パス | 説明 |
|---|:---:|---|---|
| 認証 | GET/POST | `/api/auth/[...nextauth]` | NextAuth認証 |
| ダッシュボード | GET | `/api/dashboard/stats` | 統計情報取得 |
| 車両 | GET | `/api/trucks` | 車両一覧取得 |
| 車両 | POST | `/api/trucks` | 車両登録 |
| 車両 | GET | `/api/trucks/[id]` | 車両詳細取得 |
| 車両 | PUT | `/api/trucks/[id]` | 車両更新 |
| 車両 | DELETE | `/api/trucks/[id]` | 車両削除（論理） |
| 従業員 | GET | `/api/employees` | 従業員一覧取得 |
| 従業員 | POST | `/api/employees` | 従業員登録 |
| 従業員 | GET | `/api/employees/[id]` | 従業員詳細取得 |
| 従業員 | PUT | `/api/employees/[id]` | 従業員更新 |
| 従業員 | DELETE | `/api/employees/[id]` | 従業員削除（論理） |
| 得意先 | GET | `/api/customers` | 得意先一覧取得 |
| 得意先 | POST | `/api/customers` | 得意先登録 |
| 得意先 | GET | `/api/customers/[id]` | 得意先詳細取得 |
| 得意先 | PUT | `/api/customers/[id]` | 得意先更新 |
| 得意先 | DELETE | `/api/customers/[id]` | 得意先削除（論理） |
| 日報 | GET | `/api/reports` | 日報一覧取得 |
| 日報 | POST | `/api/reports` | 日報登録 |
| 日報 | GET | `/api/reports/[id]` | 日報詳細取得 |
| 日報 | PUT | `/api/reports/[id]` | 日報更新 |
| 日報 | DELETE | `/api/reports/[id]` | 日報削除（物理） |
| 日報 | PATCH | `/api/reports/[id]/salary` | 日報給与更新 |
| 日報 | GET | `/api/reports/unbilled` | 未請求日報取得 |
| 日報 | GET | `/api/reports/by-employee` | 従業員別日報取得 |
| 日報 | GET | `/api/reports/by-ids` | ID指定日報取得 |
| 日報 | GET | `/api/reports/suggestions` | 発着地候補取得 |
| 請求書 | GET | `/api/invoices` | 請求書一覧取得 |
| 請求書 | POST | `/api/invoices` | 請求書作成 |
| 請求書 | GET | `/api/invoices/[id]` | 請求書詳細取得 |
| 請求書 | PUT | `/api/invoices/[id]` | 請求書更新 |
| 請求書 | DELETE | `/api/invoices/[id]` | 請求書削除（物理） |
| 請求書 | POST | `/api/invoices/[id]/issue` | 請求書発行 |
| 請求書 | GET | `/api/invoices/[id]/pdf` | 請求書PDF生成 |
| 請求書 | POST | `/api/invoices/[id]/send-email` | 請求書メール送信 |
| 給与 | GET | `/api/payrolls` | 給与明細一覧取得 |
| 給与 | POST | `/api/payrolls` | 給与明細作成 |
| 給与 | GET | `/api/payrolls/[id]` | 給与明細詳細取得 |
| 給与 | PUT | `/api/payrolls/[id]` | 給与明細更新 |
| 給与 | DELETE | `/api/payrolls/[id]` | 給与明細削除（物理） |
| 賃率 | GET | `/api/wage-rates` | 賃率一覧取得 |
| 賃率 | POST | `/api/wage-rates` | 賃率登録/更新 |
| 賃率 | DELETE | `/api/wage-rates` | 賃率削除 |
| 賃率 | POST | `/api/wage-rates/bulk` | 賃率一括登録 |
| チェックリスト | GET | `/api/checklist` | チェックリスト取得 |
| チェックリスト | POST | `/api/checklist` | チェックリスト登録 |
| チェックリスト | PUT | `/api/checklist/[id]` | チェックリスト更新 |
| チェックリスト | DELETE | `/api/checklist/[id]` | チェックリスト削除（物理） |
| 設定 | GET | `/api/settings` | 設定取得 |
| 設定 | POST | `/api/settings` | 設定更新 |
| 設定 | POST | `/api/settings/test-email` | テストメール送信 |
| ユーザー | GET | `/api/users` | ユーザー一覧取得 |
| ユーザー | POST | `/api/users` | ユーザー登録 |
| ユーザー | PUT | `/api/users/[id]` | ユーザー更新 |
| ユーザー | DELETE | `/api/users/[id]` | ユーザー削除（物理） |
