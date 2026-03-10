"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
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
import { Plus, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatYearMonth, formatYearMonthWithPeriod, getCurrentPayrollYearMonth } from "@/lib/payroll-period";

type Employee = {
  id: number;
  name: string;
};

type Payroll = {
  id: number;
  employee: Employee;
  yearMonth: string;
  baseSalary: string | number;
  grossPay: string | number;
  actualGrossPay: string | number;
  totalSalary: number;
  netPay: string | number;
  actualNetPay: string | number;
};

export default function PayrollsPage() {
  const [payrolls, setPayrolls] = useState<Payroll[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Filter by year-month (25日締め基準)
  const now = new Date();
  const currentPeriod = getCurrentPayrollYearMonth(now);
  const [selectedYearMonth, setSelectedYearMonth] = useState<string>("all");

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

  const fetchPayrolls = useCallback(async () => {
    setLoading(true);
    try {
      let url = "/api/payrolls";
      if (selectedYearMonth !== "all") {
        url += `?yearMonth=${selectedYearMonth}`;
      }
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setPayrolls(data);
    } catch (error) {
      console.error(error);
      toast.error("給料明細の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  }, [selectedYearMonth]);

  useEffect(() => {
    fetchPayrolls();
  }, [fetchPayrolls]);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/payrolls/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("給料明細を削除しました");
      fetchPayrolls();
    } catch (error) {
      console.error(error);
      toast.error("削除に失敗しました");
    } finally {
      setDeleteId(null);
    }
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseInt(amount) : amount;
    return num.toLocaleString("ja-JP");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">給料明細一覧</h1>
          <p className="text-muted-foreground">給料明細を管理します</p>
        </div>
        <Button asChild>
          <Link href="/payrolls/new">
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      {/* Filter */}
      <div className="flex gap-4">
        <div className="w-48">
          <Select value={selectedYearMonth} onValueChange={setSelectedYearMonth}>
            <SelectTrigger>
              <SelectValue placeholder="対象月で絞り込み" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">すべての月</SelectItem>
              {yearMonthOptions.map((ym) => (
                <SelectItem key={ym} value={ym}>
                  {formatYearMonth(ym)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : payrolls.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          給料明細がありません
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>対象月</TableHead>
                <TableHead>従業員</TableHead>
                <TableHead className="text-right">基本給</TableHead>
                <TableHead className="text-right">総支給額</TableHead>
                <TableHead className="text-right">差引支給額</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payrolls.map((payroll) => (
                <TableRow key={payroll.id}>
                  <TableCell>{formatYearMonthWithPeriod(payroll.yearMonth)}</TableCell>
                  <TableCell className="font-medium">
                    {payroll.employee.name}
                  </TableCell>
                  <TableCell className="text-right">
                    ¥{formatCurrency(payroll.baseSalary)}
                  </TableCell>
                  <TableCell className="text-right">
                    ¥{formatCurrency(payroll.actualGrossPay)}
                  </TableCell>
                  <TableCell className="text-right font-bold">
                    ¥{formatCurrency(payroll.actualNetPay)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/payrolls/${payroll.id}`}>
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(payroll.id)}
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
      )}

      <Dialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>給料明細を削除しますか？</DialogTitle>
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
    </div>
  );
}
