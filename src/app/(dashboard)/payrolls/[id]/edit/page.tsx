"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

type Employee = {
  id: number;
  name: string;
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

type AllowanceItem = {
  name: string;
  amount: number;
};

type DeductionItem = {
  name: string;
  amount: number;
};

export default function EditPayrollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payroll, setPayroll] = useState<Payroll | null>(null);
  const [baseSalary, setBaseSalary] = useState<string>("0");
  const [allowances, setAllowances] = useState<AllowanceItem[]>([]);
  const [deductions, setDeductions] = useState<DeductionItem[]>([]);

  useEffect(() => {
    const fetchPayroll = async () => {
      try {
        const response = await fetch(`/api/payrolls/${id}`);
        if (response.ok) {
          const data = await response.json();
          setPayroll(data);
          setBaseSalary(data.baseSalary.toString());
          setAllowances(
            Object.entries(data.allowances || {}).map(([name, amount]) => ({
              name,
              amount: amount as number,
            }))
          );
          setDeductions(
            Object.entries(data.deductions || {}).map(([name, amount]) => ({
              name,
              amount: amount as number,
            }))
          );
        }
      } catch (error) {
        console.error("Failed to fetch payroll:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchPayroll();
  }, [id]);

  const formatYearMonth = (ym: string) => {
    const [year, month] = ym.split("-");
    return `${year}年${parseInt(month)}月`;
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ja-JP");
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
  const allowanceTotal = allowances.reduce((sum, item) => sum + item.amount, 0);
  const deductionTotal = deductions.reduce((sum, item) => sum + item.amount, 0);
  const netPay = base + allowanceTotal - deductionTotal;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

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

      const response = await fetch(`/api/payrolls/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseSalary,
          allowances: allowancesObj,
          deductions: deductionsObj,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "エラーが発生しました");
      }

      toast.success("給料明細を更新しました");
      router.push(`/payrolls/${id}`);
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "エラーが発生しました"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (!payroll) {
    return <div className="text-center py-8">給料明細が見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">給料明細編集</h1>
        <p className="text-muted-foreground">
          {payroll.employee.name} - {formatYearMonth(payroll.yearMonth)}分
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>従業員</Label>
                <Input value={payroll.employee.name} disabled />
              </div>
              <div className="space-y-2">
                <Label>対象月</Label>
                <Input value={formatYearMonth(payroll.yearMonth)} disabled />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>給与情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="baseSalary">基本給</Label>
              <Input
                id="baseSalary"
                type="number"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                placeholder="0"
              />
            </div>

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

        {/* Summary */}
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
                <span>手当合計</span>
                <span>+¥{formatCurrency(allowanceTotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>控除合計</span>
                <span>-¥{formatCurrency(deductionTotal)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-2">
                <span>差引支給額</span>
                <span>¥{formatCurrency(netPay)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/payrolls/${id}`)}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}
