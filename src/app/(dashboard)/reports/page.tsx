"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Trash2, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { toast } from "sonner";
import { getPayrollPeriod, getCurrentPayrollYearMonth } from "@/lib/payroll-period";

type Employee = {
  id: number;
  name: string;
};

type Truck = {
  id: number;
  vehicleNumber: string;
};

type Customer = {
  id: number;
  name: string;
};

type DailyReport = {
  id: number;
  reportNumber: string;
  reportDate: string;
  employee: Employee;
  truck: Truck;
  customer: Customer;
  origin: string;
  destination: string;
  fare: string | number;
  memo: string | null;
};

export default function ReportsPage() {
  const router = useRouter();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);

  // Current month filter (initialized on client side to avoid hydration mismatch)
  const [currentDate, setCurrentDate] = useState<Date | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    const now = new Date();
    setCurrentDate(now);
    // 25日締めに基づいて現在の給与期間を取得
    const currentYearMonth = getCurrentPayrollYearMonth(now);
    const [y, m] = currentYearMonth.split("-").map(Number);
    setYear(y);
    setMonth(m);
    setInitialized(true);
  }, []);

  // Filter options
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("all");

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let url = `/api/reports?year=${year}&month=${month}`;
      if (selectedEmployeeId !== "all") {
        url += `&employeeId=${selectedEmployeeId}`;
      }
      if (selectedCustomerId !== "all") {
        url += `&customerId=${selectedCustomerId}`;
      }

      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setReports(data);
    } catch (error) {
      console.error(error);
      toast.error("日報の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [year, month, selectedEmployeeId, selectedCustomerId]);

  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const [employeesRes, customersRes] = await Promise.all([
          fetch("/api/employees"),
          fetch("/api/customers"),
        ]);
        if (employeesRes.ok) {
          setEmployees(await employeesRes.json());
        }
        if (customersRes.ok) {
          setCustomers(await customersRes.json());
        }
      } catch (error) {
        console.error(error);
        toast.error("フィルター情報の取得に失敗しました");
      }
    };
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    if (initialized && year !== null && month !== null) {
      fetchReports();
    }
  }, [initialized, year, month, fetchReports]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/reports/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("日報を削除しました");
      fetchReports();
    } catch (error) {
      console.error(error);
      toast.error("削除に失敗しました");
    } finally {
      setDeleteId(null);
    }
  };

  const handlePrevMonth = () => {
    if (!year || !month) return;
    if (month === 1) {
      setYear(year - 1);
      setMonth(12);
    } else {
      setMonth(month - 1);
    }
  };

  const handleNextMonth = () => {
    if (!year || !month) return;
    if (month === 12) {
      setYear(year + 1);
      setMonth(1);
    } else {
      setMonth(month + 1);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseInt(amount) : amount;
    return num.toLocaleString("ja-JP");
  };

  // Checkbox handlers
  const handleReportToggle = (reportId: number) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    if (selectedReportIds.length === reports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(reports.map((r) => r.id));
    }
  };

  // Get selected reports and check if same customer
  const selectedReports = reports.filter((r) =>
    selectedReportIds.includes(r.id)
  );
  const selectedCustomers = [...new Set(selectedReports.map((r) => r.customer.id))];
  const hasSameCustomer = selectedCustomers.length <= 1;

  const handleCreateInvoice = () => {
    if (selectedReportIds.length === 0) {
      toast.error("日報を選択してください");
      return;
    }

    if (!hasSameCustomer) {
      toast.error("異なる得意先の日報が選択されています。同じ得意先の日報のみ選択してください。");
      return;
    }

    // Navigate to invoice creation with selected report IDs
    const params = new URLSearchParams();
    params.set("reportIds", selectedReportIds.join(","));
    router.push(`/invoices/new?${params.toString()}`);
  };

  // Calculate totals
  const totalFare = reports.reduce((sum, r) => {
    const fare = typeof r.fare === "string" ? parseInt(r.fare) : r.fare;
    return sum + fare;
  }, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">日報一覧</h1>
          <p className="text-muted-foreground">日報を管理します</p>
        </div>
        <Button asChild>
          <Link href="/reports/new">
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Link>
        </Button>
      </div>

      {/* Month navigation */}
      {initialized && year && month && (
        <div className="flex items-center justify-center gap-2 bg-muted p-4 rounded-lg">
          <Button variant="ghost" size="icon" onClick={handlePrevMonth}>
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentDate && (() => {
                  const currentPeriodYear = parseInt(getCurrentPayrollYearMonth(currentDate).split("-")[0]);
                  return Array.from({ length: 5 }, (_, i) => currentPeriodYear - 4 + i)
                    .filter((y) => y <= currentPeriodYear)
                    .map((y) => (
                      <SelectItem key={y} value={y.toString()}>
                        {y}年
                      </SelectItem>
                    ));
                })()}
              </SelectContent>
            </Select>
            <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currentDate && (() => {
                  // 現在の給与期間月を取得（25日締め考慮）
                  const currentPeriod = getCurrentPayrollYearMonth(currentDate);
                  const [, currentPeriodMonth] = currentPeriod.split("-").map(Number);
                  const currentPeriodYear = parseInt(currentPeriod.split("-")[0]);

                  return Array.from({ length: 12 }, (_, i) => i + 1)
                    .filter((m) => year < currentPeriodYear || m <= currentPeriodMonth)
                    .map((m) => (
                      <SelectItem key={m} value={m.toString()}>
                        {m}月
                      </SelectItem>
                    ));
                })()}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNextMonth}
            disabled={!currentDate || (() => {
              const currentPeriod = getCurrentPayrollYearMonth(currentDate);
              const [currentPeriodYear, currentPeriodMonth] = currentPeriod.split("-").map(Number);
              return year === currentPeriodYear && month === currentPeriodMonth;
            })()}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Period info */}
      {year && month && (
        <p className="text-center text-sm text-muted-foreground">
          対象期間: {getPayrollPeriod(`${year}-${String(month).padStart(2, "0")}`).displayText}
          （25日締め）
        </p>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
            <SelectTrigger>
              <SelectValue placeholder="従業員で絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての従業員</SelectItem>
              {employees.map((emp) => (
                <SelectItem key={emp.id} value={emp.id.toString()}>
                  {emp.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-48">
          <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
            <SelectTrigger>
              <SelectValue placeholder="得意先で絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての得意先</SelectItem>
              {customers.map((cust) => (
                <SelectItem key={cust.id} value={cust.id.toString()}>
                  {cust.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!initialized || loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : reports.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          日報がありません
        </div>
      ) : (
        <>
          <div className="mb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              {selectedReportIds.length === reports.length
                ? "すべて解除"
                : "すべて選択"}
            </Button>
          </div>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>No.</TableHead>
                  <TableHead>日付</TableHead>
                  <TableHead>従業員</TableHead>
                  <TableHead>トラック</TableHead>
                  <TableHead>得意先</TableHead>
                  <TableHead>発地</TableHead>
                  <TableHead>着地</TableHead>
                  <TableHead className="text-right">運賃</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedReportIds.includes(report.id)}
                        onCheckedChange={() => handleReportToggle(report.id)}
                      />
                    </TableCell>
                    <TableCell className="font-mono text-sm">{report.reportNumber}</TableCell>
                    <TableCell>{formatDate(report.reportDate)}</TableCell>
                    <TableCell>{report.employee.name}</TableCell>
                    <TableCell>{report.truck.vehicleNumber}</TableCell>
                    <TableCell>{report.customer.name}</TableCell>
                    <TableCell>{report.origin}</TableCell>
                    <TableCell>{report.destination}</TableCell>
                    <TableCell className="text-right">
                      ¥{formatCurrency(report.fare)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="icon" asChild>
                          <Link href={`/reports/${report.id}/edit`}>
                            <Pencil className="h-4 w-4" />
                          </Link>
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setDeleteId(report.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {/* Summary */}
          <div className="flex justify-end">
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">月間合計</p>
              <p className="text-2xl font-bold">¥{formatCurrency(totalFare)}</p>
              <p className="text-sm text-muted-foreground">{reports.length}件</p>
            </div>
          </div>
        </>
      )}

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>日報を削除しますか？</DialogTitle>
            <DialogDescription>
              この操作は取り消せません。本当に削除しますか？
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              キャンセル
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              削除
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 固定フッターバー */}
      <div className="fixed bottom-0 left-0 right-0 bg-background border-t p-4 shadow-lg z-50">
        <div className="container mx-auto flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {selectedReportIds.length > 0 ? (
              <>
                <span className="font-medium text-foreground">{selectedReportIds.length}件</span> 選択中
                {!hasSameCustomer && (
                  <span className="ml-2 text-destructive">※異なる得意先が含まれています</span>
                )}
              </>
            ) : (
              "日報を選択してください"
            )}
          </div>
          <Button
            onClick={handleCreateInvoice}
            disabled={selectedReportIds.length === 0 || !hasSameCustomer}
          >
            <FileText className="mr-2 h-4 w-4" />
            請求書作成
          </Button>
        </div>
      </div>

      {/* フッター分のスペース */}
      <div className="h-20" />
    </div>
  );
}
