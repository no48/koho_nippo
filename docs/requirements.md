# 運送業基幹システム 要件定義書（MVP版）

**文書番号**: REQ-TRANSPORT-001
**版数**: 2.0
**作成日**: 2026年1月9日
**更新日**: 2026年1月9日

---

## 1. はじめに

### 1.1 目的

本文書は、運送会社向けクラウド型基幹システムの**Phase 1（MVP版）** の要件を定義する。段階的に機能を拡張する方針とし、まずは基本形を構築して運用しながら機能追加を行う。

### 1.2 対象読者

- システム開発者
- 運送会社経営者・管理者

### 1.3 MVP版の範囲

本文書で定義するMVP版では、以下の基本機能に絞って実装する：

1. トラック管理
2. 従業員管理
3. トラック・従業員の紐付け
4. 得意先マスタ
5. 日報管理
6. 請求書発行
7. 給料明細作成

---

## 2. システム概要

### 2.1 システム構成

```
┌─────────────────────────────────────────┐
│            クラウド環境                  │
│  ┌───────────────────────────────────┐  │
│  │     Next.js アプリケーション        │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ トラック │ 従業員 │ 得意先  │  │  │
│  │  │ 日報    │ 請求書 │ 給料明細│  │  │
│  │  └─────────────────────────────┘  │  │
│  └───────────────────────────────────┘  │
│                    │                     │
│  ┌───────────────────────────────────┐  │
│  │        PostgreSQL データベース      │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
                     │
              ┌──────┴──────┐
              │  管理者PC   │
              │（ブラウザ）  │
              └─────────────┘
```

### 2.2 技術スタック

| 項目 | 技術 |
|------|------|
| フロントエンド | Next.js（App Router） |
| バックエンド | Next.js API Routes |
| データベース | PostgreSQL |
| PDF出力 | React-PDF or PDFKit |
| 認証 | NextAuth.js |

### 2.3 利用者

| 役割 | 説明 |
|------|------|
| 管理者 | 経営者・事務員。全機能を使用 |

※ MVP版はドライバー向け機能なし。管理者のみが使用。

---

## 3. 機能要件

### 3.1 トラック管理

**概要**: 社内のトラック一覧を登録・管理する。

**機能一覧**:

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| TRK-001 | トラック一覧表示 | 登録済みトラックの一覧表示 |
| TRK-002 | トラック登録 | 新規トラックの登録 |
| TRK-003 | トラック編集 | 登録情報の修正 |
| TRK-004 | トラック削除 | トラックの削除（論理削除） |

**データ項目**:

| 項目名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| ID | 数値 | ○ | 自動採番 |
| 車両番号 | 文字列 | ○ | ナンバープレート（例: 熊谷 100 あ 1234） |
| 車種名 | 文字列 | ○ | 車種名（例: 4tウイング） |
| メモ | 文字列 | - | 備考・特記事項 |

---

### 3.2 従業員管理

**概要**: 従業員一覧を登録・管理する。

**機能一覧**:

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| EMP-001 | 従業員一覧表示 | 登録済み従業員の一覧表示 |
| EMP-002 | 従業員登録 | 新規従業員の登録 |
| EMP-003 | 従業員編集 | 登録情報の修正 |
| EMP-004 | 従業員削除 | 従業員の削除（論理削除） |

**データ項目**:

| 項目名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| ID | 数値 | ○ | 自動採番 |
| 氏名 | 文字列 | ○ | 従業員名 |
| フリガナ | 文字列 | ○ | 氏名のフリガナ |
| 電話番号 | 文字列 | - | 連絡先 |
| メモ | 文字列 | - | 備考・特記事項 |

---

### 3.3 トラック・従業員の紐付け

**概要**: トラックと従業員を関連付ける。紐付けは任意で、多対多の関係。

**仕様**:
- 1台のトラックに複数の従業員を紐付け可能
- 1人の従業員に複数のトラックを紐付け可能
- 紐付けなしでも運用可能

**機能一覧**:

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| REL-001 | 紐付け設定 | トラック画面または従業員画面から紐付けを設定 |
| REL-002 | 紐付け解除 | 紐付けの解除 |

---

### 3.4 得意先マスタ

**概要**: 請求書の宛先となるお客様情報を管理する。

**機能一覧**:

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| CUS-001 | 得意先一覧表示 | 登録済み得意先の一覧表示 |
| CUS-002 | 得意先登録 | 新規得意先の登録 |
| CUS-003 | 得意先編集 | 登録情報の修正 |
| CUS-004 | 得意先削除 | 得意先の削除（論理削除） |

**データ項目**:

| 項目名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| ID | 数値 | ○ | 自動採番 |
| 得意先名 | 文字列 | ○ | 会社名・店舗名 |
| 住所 | 文字列 | - | 住所 |
| 電話番号 | 文字列 | - | 連絡先 |
| 担当者名 | 文字列 | - | 先方担当者 |
| メモ | 文字列 | - | 備考・特記事項 |

---

### 3.5 日報管理（中心機能）

**概要**: 毎日の配送業務を記録する。システムの中心となる機能。

**機能一覧**:

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| RPT-001 | 日報一覧表示 | 月別の日報一覧表示 |
| RPT-002 | 日報登録 | 新規日報の登録 |
| RPT-003 | 日報編集 | 登録済み日報の修正 |
| RPT-004 | 日報削除 | 日報の削除 |
| RPT-005 | 日報検索 | 期間・従業員・得意先等で検索 |
| RPT-006 | 月別アーカイブ | 月別に日報を表示・切り替え |
| RPT-007 | 発着地入力予測 | 過去の入力履歴から候補を表示 |

**データ項目**:

| 項目名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| ID | 数値 | ○ | 自動採番 |
| 日付 | 日付 | ○ | 配送日 |
| 従業員 | 参照 | ○ | 担当従業員（選択） |
| トラック | 参照 | ○ | 使用トラック（選択） |
| 得意先 | 参照 | ○ | 請求先得意先（選択） |
| 発地 | 文字列 | ○ | 出発地（テキスト入力 + 入力予測） |
| 着地 | 文字列 | ○ | 到着地（テキスト入力 + 入力予測） |
| 運賃 | 数値 | ○ | 運賃（税抜） |
| 備考 | 文字列 | - | 特記事項 |

**入力予測機能の仕様**:
- 発地・着地の入力時、過去に入力された値から候補を表示
- 部分一致で検索（「東」と入力すると「東京」「東名川崎」等が候補に）
- 候補から選択 or 新規入力が可能
- 新規入力された値は自動的に履歴に蓄積

---

### 3.6 請求書発行

**概要**: 日報データから請求書を作成する。

**機能一覧**:

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| INV-001 | 請求書一覧 | 作成済み請求書の一覧表示 |
| INV-002 | 請求書作成 | 日報を選択して請求書を作成 |
| INV-003 | 請求書編集 | 請求書の内容を編集 |
| INV-004 | 請求書PDF出力 | 請求書のPDF生成・ダウンロード |
| INV-005 | 請求書削除 | 請求書の削除 |

**請求書作成フロー**:

```
1. 得意先を選択
   ↓
2. 対象期間を指定
   ↓
3. 対象の日報が一覧表示される
   ↓
4. 請求書に含める日報を選択（複数選択可）
   ↓
5. 請求書プレビュー画面
   - 明細の編集が可能（日報の情報を元に編集）
   - 金額の調整が可能
   ↓
6. 請求書保存 or PDF出力
```

**請求書データ項目**:

| 項目名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| ID | 数値 | ○ | 自動採番 |
| 請求書番号 | 文字列 | ○ | 自動採番（例: INV-202601-001） |
| 得意先 | 参照 | ○ | 請求先得意先 |
| 発行日 | 日付 | ○ | 請求書発行日 |
| 小計 | 数値 | ○ | 税抜合計 |
| 消費税 | 数値 | ○ | 消費税額 |
| 合計 | 数値 | ○ | 税込合計 |
| ステータス | 文字列 | ○ | 下書き/発行済み |

**請求書明細データ項目**:

| 項目名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| ID | 数値 | ○ | 自動採番 |
| 請求書ID | 参照 | ○ | 親請求書 |
| 日報ID | 参照 | - | 元となった日報（参照用） |
| 日付 | 日付 | ○ | 配送日 |
| 摘要 | 文字列 | ○ | 発地→着地 等の説明 |
| 金額 | 数値 | ○ | 明細金額（税抜） |

**請求書PDF出力項目**:
- 請求書番号
- 発行日
- 得意先情報（名称・住所）
- 自社情報（名称・住所・振込先）
- 明細一覧（日付・摘要・金額）
- 小計・消費税・合計

---

### 3.7 給料明細

**概要**: 月毎の従業員給料明細を作成する。MVP版では手動入力。

**機能一覧**:

| 機能ID | 機能名 | 説明 |
|--------|--------|------|
| PAY-001 | 給料明細一覧 | 作成済み給料明細の一覧表示 |
| PAY-002 | 給料明細作成 | 従業員・月を選択して給料明細を作成 |
| PAY-003 | 給料明細編集 | 給料明細の内容を編集 |
| PAY-004 | 給料明細PDF出力 | 給料明細のPDF生成・ダウンロード |
| PAY-005 | 日報参照表示 | 該当月の日報を参照表示 |

**給料明細作成フロー**:

```
1. 従業員を選択
   ↓
2. 対象年月を選択
   ↓
3. 該当月の日報が参照表示される（参考情報）
   ↓
4. 給料項目を手動入力
   - 基本給
   - 各種手当
   - 控除額
   ↓
5. 支給額が自動計算される
   ↓
6. 保存 or PDF出力
```

**給料明細データ項目**:

| 項目名 | 型 | 必須 | 説明 |
|--------|-----|------|------|
| ID | 数値 | ○ | 自動採番 |
| 従業員 | 参照 | ○ | 対象従業員 |
| 対象年月 | 文字列 | ○ | 対象年月（例: 2026-01） |
| 基本給 | 数値 | ○ | 基本給 |
| 手当（JSON） | JSON | - | 各種手当（項目名と金額の配列） |
| 控除（JSON） | JSON | - | 各種控除（項目名と金額の配列） |
| 総支給額 | 数値 | ○ | 手当を含む総額 |
| 総控除額 | 数値 | ○ | 控除の合計 |
| 差引支給額 | 数値 | ○ | 総支給額 - 総控除額 |

**手当・控除のJSON例**:
```json
{
  "手当": [
    {"項目": "残業手当", "金額": 30000},
    {"項目": "無事故手当", "金額": 10000}
  ],
  "控除": [
    {"項目": "健康保険", "金額": 15000},
    {"項目": "厚生年金", "金額": 27000},
    {"項目": "所得税", "金額": 8000}
  ]
}
```

---

## 4. 画面一覧

| 画面ID | 画面名 | 概要 |
|--------|--------|------|
| SCR-001 | ログイン | ログイン画面 |
| SCR-002 | ダッシュボード | トップページ、最近の日報表示 |
| SCR-010 | トラック一覧 | トラックの一覧・登録・編集・削除 |
| SCR-020 | 従業員一覧 | 従業員の一覧・登録・編集・削除 |
| SCR-030 | 得意先一覧 | 得意先の一覧・登録・編集・削除 |
| SCR-040 | 日報一覧 | 日報の月別表示・検索 |
| SCR-041 | 日報登録 | 日報の入力フォーム |
| SCR-050 | 請求書一覧 | 請求書の一覧 |
| SCR-051 | 請求書作成 | 日報選択→請求書編集 |
| SCR-060 | 給料明細一覧 | 給料明細の一覧 |
| SCR-061 | 給料明細作成 | 従業員・月選択→明細入力 |
| SCR-070 | 設定 | 会社情報・消費税率等の設定 |

---

## 5. データモデル

### 5.1 ER図

```
┌──────────────┐
│   trucks     │
│  (トラック)   │
└──────┬───────┘
       │ M:N
       │
┌──────┴───────┐     ┌──────────────┐
│truck_employee│     │  customers   │
│  (紐付け)    │     │  (得意先)    │
└──────┬───────┘     └──────┬───────┘
       │                    │
       │ M:N                │ 1:N
       │                    │
┌──────┴───────┐     ┌──────┴───────┐
│  employees   │────<│daily_reports │
│  (従業員)    │ 1:N │   (日報)     │
└──────────────┘     └──────┬───────┘
       │                    │
       │ 1:N                │ N:1
       │                    │
┌──────┴───────┐     ┌──────┴───────┐
│   payrolls   │     │   invoices   │
│ (給料明細)   │     │  (請求書)    │
└──────────────┘     └──────┬───────┘
                            │ 1:N
                     ┌──────┴───────┐
                     │invoice_items │
                     │ (請求書明細) │
                     └──────────────┘
```

### 5.2 テーブル定義

#### trucks（トラック）
```sql
CREATE TABLE trucks (
  id SERIAL PRIMARY KEY,
  vehicle_number VARCHAR(50) NOT NULL,
  vehicle_name VARCHAR(100) NOT NULL,
  memo TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### employees（従業員）
```sql
CREATE TABLE employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  name_kana VARCHAR(200) NOT NULL,
  phone VARCHAR(20),
  memo TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### truck_employee（トラック・従業員紐付け）
```sql
CREATE TABLE truck_employee (
  id SERIAL PRIMARY KEY,
  truck_id INTEGER REFERENCES trucks(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(truck_id, employee_id)
);
```

#### customers（得意先）
```sql
CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  address TEXT,
  phone VARCHAR(20),
  contact_person VARCHAR(100),
  memo TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### daily_reports（日報）
```sql
CREATE TABLE daily_reports (
  id SERIAL PRIMARY KEY,
  report_date DATE NOT NULL,
  employee_id INTEGER REFERENCES employees(id),
  truck_id INTEGER REFERENCES trucks(id),
  customer_id INTEGER REFERENCES customers(id),
  origin VARCHAR(200) NOT NULL,
  destination VARCHAR(200) NOT NULL,
  fare DECIMAL(12, 0) NOT NULL,
  memo TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 発着地の入力予測用インデックス
CREATE INDEX idx_daily_reports_origin ON daily_reports(origin);
CREATE INDEX idx_daily_reports_destination ON daily_reports(destination);
```

#### invoices（請求書）
```sql
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  customer_id INTEGER REFERENCES customers(id),
  issue_date DATE NOT NULL,
  subtotal DECIMAL(12, 0) NOT NULL,
  tax DECIMAL(12, 0) NOT NULL,
  total DECIMAL(12, 0) NOT NULL,
  status VARCHAR(20) DEFAULT 'draft',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### invoice_items（請求書明細）
```sql
CREATE TABLE invoice_items (
  id SERIAL PRIMARY KEY,
  invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
  daily_report_id INTEGER REFERENCES daily_reports(id),
  item_date DATE NOT NULL,
  description VARCHAR(500) NOT NULL,
  amount DECIMAL(12, 0) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### payrolls（給料明細）
```sql
CREATE TABLE payrolls (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id),
  year_month VARCHAR(7) NOT NULL,
  base_salary DECIMAL(10, 0) NOT NULL,
  allowances JSONB DEFAULT '[]',
  deductions JSONB DEFAULT '[]',
  gross_pay DECIMAL(12, 0) NOT NULL,
  total_deduction DECIMAL(12, 0) NOT NULL,
  net_pay DECIMAL(12, 0) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(employee_id, year_month)
);
```

#### settings（設定）
```sql
CREATE TABLE settings (
  id SERIAL PRIMARY KEY,
  key VARCHAR(100) UNIQUE NOT NULL,
  value TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 初期設定
INSERT INTO settings (key, value) VALUES
  ('company_name', ''),
  ('company_address', ''),
  ('company_phone', ''),
  ('bank_info', ''),
  ('tax_rate', '10');
```

---

## 6. 非機能要件

### 6.1 性能要件

| 項目 | 要件 |
|------|------|
| 同時接続数 | 5ユーザー以上 |
| 画面応答時間 | 3秒以内 |
| PDF出力時間 | 10秒以内 |

### 6.2 セキュリティ要件

| 項目 | 要件 |
|------|------|
| 認証方式 | ID/パスワード認証 |
| 通信暗号化 | HTTPS |
| セッション | 24時間でタイムアウト |

### 6.3 対応環境

| 項目 | 要件 |
|------|------|
| ブラウザ | Chrome、Edge、Safari（最新版） |
| デバイス | PC、タブレット |

---

## 7. 将来拡張（Phase 2以降）

以下の機能は将来バージョンで対応予定：

| 優先度 | 機能 | 概要 |
|--------|------|------|
| 高 | 日報項目追加 | 荷物名・数量・距離・時間 |
| 高 | 勤怠情報 | 出退勤時刻・休憩時間 |
| 高 | 給料自動計算 | 日報から給料を自動集計 |
| 中 | 運賃マスタ | 自動運賃計算用のマスタ |
| 中 | 車検・点検アラート | 期限管理とアラート通知 |
| 中 | 免許・資格管理 | 期限管理とアラート通知 |
| 低 | 法令対応 | 改善基準告示等の対応 |
| 低 | 経営分析 | 売上・収支の分析機能 |
| 低 | デジタコ連携 | デジタルタコグラフ連携 |

---

## 改訂履歴

| 版数 | 日付 | 変更内容 | 作成者 |
|------|------|----------|--------|
| 1.0 | 2026/01/09 | 初版作成（フル版） | - |
| 2.0 | 2026/01/09 | MVP版に改訂 | - |
