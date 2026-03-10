"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { getCurrentPayrollYearMonth } from "@/lib/payroll-period";

type Employee = {
  id: number;
  name: string;
  baseSalary: string | number | null;
};

type DailyReport = {
  id: number;
  reportDate: string;
  origin: string;
  destination: string;
  fare: string | number;
  customer: { name: string };
};

type ReportSummary = {
  reports: DailyReport[];
  summary: {
    count: number;
    totalFare: number;
    totalSalary: number;
  };
};

type AllowanceItem = {
  name: string;
  amount: number;
};

type DeductionItem = {
  name: string;
  amount: number;
};

export default function NewPayrollPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [reportData, setReportData] = useState<ReportSummary | null>(null);

  const now = new Date();
  // 25日締めに基づいて現在の給与期間を取得
  const currentPeriod = getCurrentPayrollYearMonth(now);

  const [employeeId, setEmployeeId] = useState<string>("");
  const [yearMonth, setYearMonth] = useState(currentPeriod);
  const [baseSalary, setBaseSalary] = useState<string>("0");
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);

  // Generate year-month options (25日締め基準で現在月から過去12ヶ月)
  const yearMonthOptions: string[] = [];
  const [currentYear, currentMonth] = currentPeriod.split("-").map(Number);
  for (let i = 0; i < 12; i++) {
    let year = currentYear;
    let month = currentMonth - i;
    if (month <= 0) {
      month += 12;
      year -= 1;
    }
    yearMonthOptions.push(
      `${year}-${String(month).padStart(2, "0")}`
    );
  }

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/employees");
        if (response.ok) {
          setEmployees(await response.json());
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchEmployees();
  }, []);

  useEffect(() => {
    if (!employeeId || !yearMonth) {
      setReportData(null);
      return;
    }

    const fetchReports = async () => {
      try {
        const response = await fetch(
          `/api/reports/by-employee?employeeId=${employeeId}&yearMonth=${yearMonth}`
        );
        if (response.ok) {
          setReportData(await response.json());
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchReports();
  }, [employeeId, yearMonth]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatYearMonth = (ym: string) => {
    const [year, month] = ym.split("-");
    return `${year}年${parseInt(month)}月`;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseInt(amount) : amount;
    return num.toLocaleString("ja-JP");
  };

  // Handle employee selection - auto-fill base salary
  const handleEmployeeChange = (empId: string) => {
    setEmployeeId(empId);
    const employee = employees.find((e) => e.id.toString() === empId);
    if (employee?.baseSalary) {
      setBaseSalary(employee.baseSalary.toString());
    } else {
      setBaseSalary("0");
    }
  };

  const handleAddAllowance = () => {
    setAllowances([...allowances, { name: "", amount: 0 }]);
  };

  const handleRemoveAllowance = (index: number) => {
    setAllowances(allowances.filter((_, i) => i !== index));
  };

  const handleAllowanceChange = (
    index: number,
    field: "name" | "amount",
    value: string
  ) => {
    setAllowances(
      allowances.map((item, i) =>
        i === index
          ? { ...item, [field]: field === "amount" ? parseInt(value) || 0 : value }
          : item
      )
    );
  };

  const handleAddDeduction = () => {
    setDeductions([...deductions, { name: "", amount: 0 }]);
  };

  const handleRemoveDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index));
  };

  const handleDeductionChange = (
    index: number,
    field: "name" | "amount",
    value: string
  ) => {
    setDeductions(
      deductions.map((item, i) =>
        i === index
          ? { ...item, [field]: field === "amount" ? parseInt(value) || 0 : value }
          : item
      )
    );
  };

  // Calculate totals
  const base = parseInt(baseSalary) || 0;
  const workSalary = reportData?.summary.totalSalary || 0;
  const allowanceTotal = allowances.reduce((sum, item) => sum + item.amount, 0);
  const deductionTotal = deductions.reduce((sum, item) => sum + item.amount, 0);
  const grossPay = base + workSalary + allowanceTotal;
  const netPay = grossPay - deductionTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!employeeId || !yearMonth) {
      toast.error("従業員と対象月を選択してください");
      return;
    }

    setLoading(true);

    try {
      const allowancesObj: Record<string, number> = {};
      allowances.forEach((item) => {
        if (item.name) {
          allowancesObj[item.name] = item.amount;
        }
      });

      const deductionsObj: Record<string, number> = {};
      deductions.forEach((item) => {
        if (item.name) {
          deductionsObj[item.name] = item.amount;
        }
      });

      const response = await fetch("/api/payrolls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId,
          yearMonth,
          baseSalary,
          allowances: allowancesObj,
          deductions: deductionsObj,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "エラーが発生しました");
      }

      toast.success("給料明細を作成しました");
      router.push("/payrolls");
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "エラーが発生しました"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">給料明細作成</h1>
        <p className="text-muted-foreground">新しい給料明細を作成します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="employeeId">
                  従業員 <span className="text-destructive">*</span>
                </Label>
                <Select value={employeeId} onValueChange={handleEmployeeChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="従業員を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}
                        {emp.baseSalary && ` (基本給: ¥${formatCurrency(emp.baseSalary)})`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="yearMonth">
                  対象月 <span className="text-destructive">*</span>
                </Label>
                <Select value={yearMonth} onValueChange={setYearMonth}>
                  <SelectTrigger>
                    <SelectValue placeholder="対象月を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    {yearMonthOptions.map((ym) => (
                      <SelectItem key={ym} value={ym}>
                        {formatYearMonth(ym)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Daily reports reference */}
        {reportData && (
          <Card>
            <CardHeader>
              <CardTitle>当月の日報（参考）</CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.reports.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  当月の日報はありません
                </p>
              ) : (
                <>
                  <div className="border rounded-lg mb-4">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>日付</TableHead>
                          <TableHead>得意先</TableHead>
                          <TableHead>発着地</TableHead>
                          <TableHead className="text-right">運賃</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {reportData.reports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>{formatDate(report.reportDate)}</TableCell>
                            <TableCell>{report.customer.name}</TableCell>
                            <TableCell>
                              {report.origin} → {report.destination}
                            </TableCell>
                            <TableCell className="text-right">
                              ¥{formatCurrency(report.fare)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="text-right space-y-1">
                    <p className="text-sm text-muted-foreground">
                      稼働日数: {reportData.summary.count}日 / 運賃合計: ¥
                      {formatCurrency(reportData.summary.totalFare)}
                    </p>
                    <p className="text-sm font-medium">
                      稼働給与合計: ¥{formatCurrency(reportData.summary.totalSalary)}
                    </p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 手当・控除（オプション） */}
        {employeeId && (
          <Card>
            <CardHeader>
              <CardTitle>手当・控除（オプション）</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Allowances */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>手当</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddAllowance}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    追加
                  </Button>
                </div>
                {allowances.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>項目名</TableHead>
                          <TableHead className="w-40">金額</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {allowances.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                value={item.name}
                                onChange={(e) =>
                                  handleAllowanceChange(index, "name", e.target.value)
                                }
                                placeholder="例: 通勤手当"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.amount}
                                onChange={(e) =>
                                  handleAllowanceChange(index, "amount", e.target.value)
                                }
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveAllowance(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>

              {/* Deductions */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>控除</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddDeduction}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    追加
                  </Button>
                </div>
                {deductions.length > 0 && (
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>項目名</TableHead>
                          <TableHead className="w-40">金額</TableHead>
                          <TableHead className="w-16"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {deductions.map((item, index) => (
                          <TableRow key={index}>
                            <TableCell>
                              <Input
                                value={item.name}
                                onChange={(e) =>
                                  handleDeductionChange(index, "name", e.target.value)
                                }
                                placeholder="例: 健康保険"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                value={item.amount}
                                onChange={(e) =>
                                  handleDeductionChange(index, "amount", e.target.value)
                                }
                                placeholder="0"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => handleRemoveDeduction(index)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Summary */}
        {employeeId && (
          <Card>
            <CardHeader>
              <CardTitle>支給額</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>基本給</span>
                  <span>¥{formatCurrency(base)}</span>
                </div>
                <div className="flex justify-between">
                  <span>稼働給与</span>
                  <span>¥{formatCurrency(workSalary)}</span>
                </div>
                {allowanceTotal > 0 && (
                  <div className="flex justify-between">
                    <span>手当合計</span>
                    <span>+¥{formatCurrency(allowanceTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2">
                  <span>総支給額</span>
                  <span>¥{formatCurrency(grossPay)}</span>
                </div>
                {deductionTotal > 0 && (
                  <div className="flex justify-between">
                    <span>控除合計</span>
                    <span>-¥{formatCurrency(deductionTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>差引支給額</span>
                  <span>¥{formatCurrency(netPay)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "作成中..." : "給料明細を作成"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/payrolls")}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}
