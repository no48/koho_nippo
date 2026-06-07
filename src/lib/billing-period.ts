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
