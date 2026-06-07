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
