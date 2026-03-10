"use client";

import { useEffect, useState, use, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Pencil, Printer, Save } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { formatYearMonth, formatYearMonthWithPeriod } from "@/lib/payroll-period";

type Employee = {
  id: number;
  name: string;
  nameKana: string;
  wageType: string | null;
};

type Payroll = {
  id: number;
  employee: Employee;
  yearMonth: string;
  baseSalary: string | number;
  allowances: Record<string, number>;
  deductions: Record<string, number>;
  netPay: string | number;
};

type DailyReport = {
  id: number;
  reportDate: string;
  origin: string;
  destination: string;
  fare: string | number;
  salary: string | number | null;
  tollFee: string | number | null;
  workItems: string | null;
  wageType: string | null;
  customer: { name: string };
};

type WageRate = {
  workItem: string;
  rate: number;
  sortOrder: number;
};

type ReportSummary = {
  reports: DailyReport[];
  summary: {
    count: number;
    totalFare: number;
    totalSalary: number;
  };
};

export default function PayrollDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [reportData, setReportData] = useState<ReportSummary | null>(null);
  const [wageRates, setWageRates] = useState<WageRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editedSalaries, setEditedSalaries] = useState<Record<number, string>>({});
  const printRef = useRef<HTMLDivElement>(null);

  // Check if there are unsaved changes
  const hasChanges = Object.keys(editedSalaries).length > 0;

  // Warn user before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasChanges) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasChanges]);

  // Handle salary input change
  const handleSalaryChange = (reportId: number, value: string) => {
    const report = reportData?.reports.find((r) => r.id === reportId);
    const originalValue = report?.salary?.toString() || "";

    if (value === originalValue) {
      // Remove from edited if back to original
      setEditedSalaries((prev) => {
        const next = { ...prev };
        delete next[reportId];
        return next;
      });
    } else {
      setEditedSalaries((prev) => ({ ...prev, [reportId]: value }));
    }
  };

  // Get current salary value for input
  const getSalaryValue = (report: DailyReport) => {
    if (editedSalaries[report.id] !== undefined) {
      return editedSalaries[report.id];
    }
    return report.salary?.toString() || "";
  };

  // Calculate edited total salary
  const getEditedTotalSalary = () => {
    if (!reportData) return 0;
    return reportData.reports.reduce((sum, report) => {
      const value = editedSalaries[report.id] !== undefined
        ? editedSalaries[report.id]
        : report.salary?.toString() || "0";
      return sum + (parseInt(value) || 0);
    }, 0);
  };

  // Save all edited salaries
  const handleSaveSalaries = async () => {
    setSaving(true);
    try {
      const updates = Object.entries(editedSalaries).map(([reportId, salary]) =>
        fetch(`/api/reports/${reportId}/salary`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ salary: salary || null }),
        })
      );

      const results = await Promise.all(updates);
      const allOk = results.every((res) => res.ok);

      if (allOk) {
        toast.success("給与を保存しました");
        setEditedSalaries({});
        // Refresh data
        if (payroll?.employee?.id && payroll?.yearMonth) {
          const reportsRes = await fetch(
            `/api/reports/by-employee?employeeId=${payroll.employee.id}&yearMonth=${payroll.yearMonth}`
          );
          if (reportsRes.ok) {
            setReportData(await reportsRes.json());
          }
        }
      } else {
        toast.error("一部の給与の保存に失敗しました");
      }
    } catch (error) {
      console.error("Failed to save salaries:", error);
      toast.error("給与の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        const response = await fetch(`/api/payrolls/${id}`);
        if (response.ok) {
          const data = await response.json();
          setPayroll(data);

          // Fetch daily reports for this employee and month
          if (data.employee?.id && data.yearMonth) {
            const reportsRes = await fetch(
              `/api/reports/by-employee?employeeId=${data.employee.id}&yearMonth=${data.yearMonth}`
            );
            if (reportsRes.ok) {
              setReportData(await reportsRes.json());
            }
          }

          // Fetch wage rates for the employee's wage type
          if (data.employee?.wageType) {
            const wageRatesRes = await fetch(
              `/api/wage-rates?wageType=${encodeURIComponent(data.employee.wageType)}`
            );
            if (wageRatesRes.ok) {
              const rates = await wageRatesRes.json();
              setWageRates(rates);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch payroll:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseInt(amount) : amount;
    return num.toLocaleString("ja-JP");
  };

  // Parse workItems JSON string and aggregate across all reports
  const getWorkItemBreakdown = () => {
    if (!reportData || wageRates.length === 0) return [];

    // Count occurrences of each work item
    const itemCounts: Record<string, number> = {};
    reportData.reports.forEach((report) => {
      if (!report.workItems) return;
      try {
        const items = JSON.parse(report.workItems) as string[];
        items.forEach((item) => {
          itemCounts[item] = (itemCounts[item] || 0) + 1;
        });
      } catch {
        // Ignore parse errors
      }
    });

    // Map to wage rates and calculate totals
    const breakdown = wageRates
      .filter((rate) => itemCounts[rate.workItem])
      .map((rate) => ({
        workItem: rate.workItem,
        rate: rate.rate,
        count: itemCounts[rate.workItem],
        subtotal: rate.rate * itemCounts[rate.workItem],
        sortOrder: rate.sortOrder,
      }))
      .sort((a, b) => a.sortOrder - b.sortOrder);

    return breakdown;
  };

  const workItemBreakdown = getWorkItemBreakdown();

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (!payroll) {
    return <div className="text-center py-8">給料明細が見つかりません</div>;
  }

  const baseSalary =
    typeof payroll.baseSalary === "string"
      ? parseInt(payroll.baseSalary)
      : payroll.baseSalary;

  const allowanceTotal = Object.values(payroll.allowances || {}).reduce(
    (sum, val) => sum + val,
    0
  );

  const deductionTotal = Object.values(payroll.deductions || {}).reduce(
    (sum, val) => sum + val,
    0
  );

  return (
    <div className="space-y-6">
      {/* Header - hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold">給料明細詳細</h1>
          <p className="text-muted-foreground">
            {payroll.employee.name} - {formatYearMonth(payroll.yearMonth)}分
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/payrolls/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              編集
            </Link>
          </Button>
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            印刷 / PDF
          </Button>
        </div>
      </div>

      {/* Payroll content - printable */}
      <div ref={printRef} data-printable>
        <Card className="print:shadow-none print:border-none">
          <CardHeader className="text-center border-b">
            <CardTitle className="text-3xl">給料明細書</CardTitle>
            <p className="text-lg mt-2">{formatYearMonth(payroll.yearMonth)}分</p>
          </CardHeader>
          <CardContent className="space-y-6 pt-6">
            {/* Employee info */}
            <div className="border-b pb-4">
              <p className="text-xl font-bold">{payroll.employee.name} 様</p>
              <p className="text-sm text-muted-foreground">
                {payroll.employee.nameKana}
              </p>
            </div>

            {/* Net pay highlight */}
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">差引支給額</p>
              <p className="text-3xl font-bold">
                ¥{formatCurrency(
                  baseSalary +
                  allowanceTotal +
                  (hasChanges ? getEditedTotalSalary() : (reportData?.summary.totalSalary || 0)) -
                  deductionTotal
                )}
              </p>
            </div>

            {/* Daily reports for the month */}
            {reportData && reportData.reports.length > 0 && (
              <div>
                <div className="flex items-center justify-between mb-2 border-b pb-1">
                  <h3 className="font-semibold">{formatYearMonthWithPeriod(payroll.yearMonth)}の稼働実績</h3>
                  {hasChanges && (
                    <Button
                      size="sm"
                      onClick={handleSaveSalaries}
                      disabled={saving}
                      className="print:hidden"
                    >
                      <Save className="mr-2 h-4 w-4" />
                      {saving ? "保存中..." : "給与を保存"}
                    </Button>
                  )}
                </div>
                <div className="border rounded-lg mb-2">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16">日付</TableHead>
                        <TableHead>得意先</TableHead>
                        <TableHead>発着地</TableHead>
                        <TableHead className="w-20">給与形態</TableHead>
                        <TableHead>作業内容</TableHead>
                        <TableHead className="text-right w-24 print:hidden">運賃</TableHead>
                        <TableHead className="text-right w-28 print:w-24">給与</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reportData.reports.map((report) => {
                        // 作業内容をパース
                        const workItemsList = report.workItems
                          ? (() => {
                              try {
                                return JSON.parse(report.workItems) as string[];
                              } catch {
                                return [];
                              }
                            })()
                          : [];
                        return (
                          <TableRow
                            key={report.id}
                            className={editedSalaries[report.id] !== undefined ? "bg-yellow-50" : ""}
                          >
                            <TableCell>{formatDate(report.reportDate)}</TableCell>
                            <TableCell className="text-sm">{report.customer.name}</TableCell>
                            <TableCell className="text-sm">
                              {report.origin} → {report.destination}
                            </TableCell>
                            <TableCell className="text-sm">{report.wageType || "-"}</TableCell>
                            <TableCell className="text-sm">
                              {workItemsList.length > 0 ? workItemsList.join("、") : "-"}
                            </TableCell>
                            <TableCell className="text-right print:hidden">
                              ¥{formatCurrency(report.fare)}
                            </TableCell>
                            <TableCell className="text-right p-1">
                              {/* Show input on screen, show value when printing */}
                              <div className="print:hidden">
                                <Input
                                  type="number"
                                  value={getSalaryValue(report)}
                                  onChange={(e) => handleSalaryChange(report.id, e.target.value)}
                                  className="w-24 text-right h-8"
                                  placeholder="0"
                                />
                              </div>
                              <span className="hidden print:inline">
                                {report.salary ? `¥${formatCurrency(report.salary)}` : "-"}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  稼働日数: <span className="font-semibold">{reportData.summary.count}日</span>
                  <span className="print:hidden">
                    {" / "}
                    運賃合計: <span className="font-semibold">¥{formatCurrency(reportData.summary.totalFare)}</span>
                  </span>
                  {" / "}
                  給与合計: <span className={`font-semibold ${hasChanges ? "text-yellow-600" : ""}`}>
                    ¥{formatCurrency(hasChanges ? getEditedTotalSalary() : reportData.summary.totalSalary)}
                    {hasChanges && " (未保存)"}
                  </span>
                </div>
              </div>
            )}

            {/* Work item breakdown */}
            {workItemBreakdown.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2 border-b pb-1">稼働給与内訳</h3>
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>作業項目</TableHead>
                        <TableHead className="text-right">単価</TableHead>
                        <TableHead className="text-right">回数</TableHead>
                        <TableHead className="text-right">小計</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {workItemBreakdown.map((item) => (
                        <TableRow key={item.workItem}>
                          <TableCell>{item.workItem}</TableCell>
                          <TableCell className="text-right">¥{formatCurrency(item.rate)}</TableCell>
                          <TableCell className="text-right">{item.count}回</TableCell>
                          <TableCell className="text-right">¥{formatCurrency(item.subtotal)}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow className="font-bold bg-muted/50">
                        <TableCell colSpan={3}>稼働給与合計</TableCell>
                        <TableCell className="text-right">
                          ¥{formatCurrency(workItemBreakdown.reduce((sum, item) => sum + item.subtotal, 0))}
                        </TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-6">
              {/* Earnings */}
              <div>
                <h3 className="font-semibold mb-2 border-b pb-1">支給</h3>
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell>基本給</TableCell>
                      <TableCell className="text-right">
                        ¥{formatCurrency(baseSalary)}
                      </TableCell>
                    </TableRow>
                    {reportData && (reportData.summary.totalSalary > 0 || hasChanges) && (
                      <TableRow>
                        <TableCell>稼働給与</TableCell>
                        <TableCell className="text-right">
                          ¥{formatCurrency(hasChanges ? getEditedTotalSalary() : reportData.summary.totalSalary)}
                        </TableCell>
                      </TableRow>
                    )}
                    {Object.entries(payroll.allowances || {}).map(
                      ([name, amount]) => (
                        <TableRow key={name}>
                          <TableCell>{name}</TableCell>
                          <TableCell className="text-right">
                            ¥{formatCurrency(amount)}
                          </TableCell>
                        </TableRow>
                      )
                    )}
                    <TableRow className="font-bold">
                      <TableCell>支給合計</TableCell>
                      <TableCell className="text-right">
                        ¥{formatCurrency(
                          baseSalary +
                          allowanceTotal +
                          (hasChanges ? getEditedTotalSalary() : (reportData?.summary.totalSalary || 0))
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              {/* Deductions */}
              <div>
                <h3 className="font-semibold mb-2 border-b pb-1">控除</h3>
                <Table>
                  <TableBody>
                    {Object.entries(payroll.deductions || {}).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={2}
                          className="text-center text-muted-foreground"
                        >
                          控除項目なし
                        </TableCell>
                      </TableRow>
                    ) : (
                      Object.entries(payroll.deductions || {}).map(
                        ([name, amount]) => (
                          <TableRow key={name}>
                            <TableCell>{name}</TableCell>
                            <TableCell className="text-right">
                              ¥{formatCurrency(amount)}
                            </TableCell>
                          </TableRow>
                        )
                      )
                    )}
                    <TableRow className="font-bold">
                      <TableCell>控除合計</TableCell>
                      <TableCell className="text-right">
                        ¥{formatCurrency(deductionTotal)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-4 text-sm text-muted-foreground text-center">
              <p>上記の通り支給いたします</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="print:hidden">
        <Button variant="outline" onClick={() => router.push("/payrolls")}>
          一覧に戻る
        </Button>
      </div>

    </div>
  );
}
