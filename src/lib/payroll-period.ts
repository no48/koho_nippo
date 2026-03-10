/**
 * 給与計算期間ユーティリティ（25日締め）
 *
 * 例:
 * - 1月分 = 前年12/26 〜 1/25
 * - 2月分 = 1/26 〜 2/25
 */

export type PayrollPeriod = {
  startDate: Date;
  endDate: Date;
  displayText: string;
};

/**
 * 給与計算期間（25日締め）を計算
 * @param yearMonth - "YYYY-MM" 形式
 * @returns { startDate, endDate, displayText }
 */
export function getPayrollPeriod(yearMonth: string): PayrollPeriod {
  const [year, month] = yearMonth.split("-").map(Number);

  // 1月分 = 前年12/26 〜 1/25
  // month - 2 で前月、26日から開始
  const startDate = new Date(year, month - 2, 26);
  // month - 1 で当月、25日で終了
  const endDate = new Date(year, month - 1, 25);

  // 表示用テキスト
  const startMonth = startDate.getMonth() + 1;
  const endMonth = endDate.getMonth() + 1;

  return {
    startDate,
    endDate,
    displayText: `${startMonth}/26〜${endMonth}/25`,
  };
}

/**
 * 年月表示フォーマット（シンプル）
 * @param yearMonth - "YYYY-MM" 形式
 * @returns "2024年1月" 形式
 */
export function formatYearMonth(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  return `${year}年${month}月`;
}

/**
 * 年月表示フォーマット（期間付き）
 * @param yearMonth - "YYYY-MM" 形式
 * @returns "2024年1月分 (12/26〜1/25)" 形式
 */
export function formatYearMonthWithPeriod(yearMonth: string): string {
  const [year, month] = yearMonth.split("-").map(Number);
  const period = getPayrollPeriod(yearMonth);
  return `${year}年${month}月分 (${period.displayText})`;
}

/**
 * 指定日が属する給与期間の年月を取得
 * - 1日〜25日 → その月の給与期間
 * - 26日〜末日 → 翌月の給与期間
 *
 * @param date - 対象日（省略時は今日）
 * @returns "YYYY-MM" 形式
 */
export function getCurrentPayrollYearMonth(date: Date = new Date()): string {
  const day = date.getDate();
  let year = date.getFullYear();
  let month = date.getMonth() + 1; // 1-based

  // 26日以降は翌月の給与期間
  if (day >= 26) {
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }

  return `${year}-${String(month).padStart(2, "0")}`;
}

/**
 * 現在の給与期間を取得
 * @param date - 対象日（省略時は今日）
 * @returns PayrollPeriod
 */
export function getCurrentPayrollPeriod(date: Date = new Date()): PayrollPeriod {
  const yearMonth = getCurrentPayrollYearMonth(date);
  return getPayrollPeriod(yearMonth);
}
