"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { CustomerAutocomplete } from "@/components/ui/customer-autocomplete";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type DailyReport = {
  id: number;
  reportDate: string;
  origin: string;
  destination: string;
  fare: string | number;
  workItems: string | null;
  employee: { name: string };
  customer: { id: number; name: string };
};

type ManualItem = {
  id: string; // UI用の一時ID
  itemDate: string;
  description: string;
  amount: string;
  tollFee: string;
};

// workItemsをパースしてカンマ区切り文字列に変換
const parseWorkItems = (workItems: string | null): string => {
  if (!workItems) return "";
  try {
    return JSON.parse(workItems).join("、");
  } catch {
    return "";
  }
};

export default function NewInvoicePage() {
  return (
    <Suspense fallback={<div className="text-center py-8">読み込み中...</div>}>
      <NewInvoicePageContent />
    </Suspense>
  );
}

function NewInvoicePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [unbilledReports, setUnbilledReports] = useState<DailyReport[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [customerId, setCustomerId] = useState<string>("");
  const [customerName, setCustomerName] = useState<string>("");
  const [issueDate, setIssueDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [initialReportIds, setInitialReportIds] = useState<number[]>([]);
  const [manualItems, setManualItems] = useState<ManualItem[]>([]);

  // Load initial report IDs from URL params
  useEffect(() => {
    const reportIdsParam = searchParams.get("reportIds");
    if (reportIdsParam) {
      const ids = reportIdsParam.split(",").map((id) => parseInt(id)).filter((id) => !isNaN(id));
      setInitialReportIds(ids);

      // Fetch the reports by IDs to get customer info
      const fetchInitialReports = async () => {
        try {
          const response = await fetch(`/api/reports/by-ids?ids=${reportIdsParam}`);
          if (response.ok) {
            const data = await response.json();
            if (data.length > 0) {
              // Set customer from the first report
              setCustomerId(data[0].customer.id.toString());
              setCustomerName(data[0].customer.name);
              setUnbilledReports(data);
              setSelectedReportIds(ids);
            }
          }
        } catch (error) {
          console.error(error);
        }
      };
      fetchInitialReports();
    }
  }, [searchParams]);

  useEffect(() => {
    // Skip if we have initial report IDs (already loaded)
    if (initialReportIds.length > 0) return;

    if (!customerId) {
      setUnbilledReports([]);
      return;
    }

    const fetchUnbilledReports = async () => {
      try {
        const response = await fetch(
          `/api/reports/unbilled?customerId=${customerId}`
        );
        if (response.ok) {
          const data = await response.json();
          setUnbilledReports(data);
          setSelectedReportIds([]);
        }
      } catch (error) {
        console.error(error);
      }
    };
    fetchUnbilledReports();
  }, [customerId, initialReportIds]);

  const handleReportToggle = (reportId: number) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    if (selectedReportIds.length === unbilledReports.length) {
      setSelectedReportIds([]);
    } else {
      setSelectedReportIds(unbilledReports.map((r) => r.id));
    }
  };

  // 手動明細の追加
  const handleAddManualItem = () => {
    setManualItems((prev) => [
      ...prev,
      {
        id: `manual-${Date.now()}`,
        itemDate: issueDate,
        description: "",
        amount: "",
        tollFee: "",
      },
    ]);
  };

  // 手動明細の削除
  const handleRemoveManualItem = (id: string) => {
    setManualItems((prev) => prev.filter((item) => item.id !== id));
  };

  // 手動明細の更新
  const handleManualItemChange = (
    id: string,
    field: keyof ManualItem,
    value: string
  ) => {
    setManualItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseInt(amount) : amount;
    return num.toLocaleString("ja-JP");
  };

  const selectedReports = unbilledReports.filter((r) =>
    selectedReportIds.includes(r.id)
  );

  // 日報からの小計
  const reportSubtotal = selectedReports.reduce((sum, r) => {
    const fare = typeof r.fare === "string" ? parseInt(r.fare) : r.fare;
    return sum + fare;
  }, 0);

  // 手動明細からの小計
  const manualSubtotal = manualItems.reduce((sum, item) => {
    const amount = parseInt(item.amount) || 0;
    return sum + amount;
  }, 0);

  // 手動明細の通行料合計
  const manualTollFeeTotal = manualItems.reduce((sum, item) => {
    const fee = parseInt(item.tollFee) || 0;
    return sum + fee;
  }, 0);

  const subtotal = reportSubtotal + manualSubtotal;
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;
  const hasItems = selectedReportIds.length > 0 || manualItems.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!customerId) {
      toast.error("得意先を選択してください");
      return;
    }

    if (!hasItems) {
      toast.error("日報を選択するか、手動で明細を追加してください");
      return;
    }

    // 手動明細のバリデーション
    for (const item of manualItems) {
      if (!item.description || !item.amount) {
        toast.error("手動明細の説明と金額は必須です");
        return;
      }
    }

    setLoading(true);

    try {
      // 日報からの明細
      const reportItems = selectedReports.map((r) => {
        const workItemsStr = parseWorkItems(r.workItems);
        return {
          dailyReportId: r.id,
          itemDate: r.reportDate,
          description: `${formatDate(r.reportDate)} ${r.origin} → ${r.destination}${workItemsStr ? ` [${workItemsStr}]` : ""}`,
          amount: typeof r.fare === "string" ? parseInt(r.fare) : r.fare,
        };
      });

      // 手動入力の明細
      const manualItemsData = manualItems.map((item) => ({
        itemDate: item.itemDate,
        description: item.description,
        amount: parseInt(item.amount) || 0,
        tollFee: parseInt(item.tollFee) || 0,
      }));

      const response = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          issueDate,
          items: [...reportItems, ...manualItemsData],
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "エラーが発生しました");
      }

      toast.success("請求書を作成しました");
      router.push("/invoices");
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
        <h1 className="text-3xl font-bold">請求書作成</h1>
        <p className="text-muted-foreground">日報から選択、または手動で明細を入力します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="issueDate">
                  発行日 <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="issueDate"
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="customerId">
                  得意先 <span className="text-destructive">*</span>
                </Label>
                <CustomerAutocomplete
                  id="customerId"
                  value={customerName}
                  onSelect={(id, name) => {
                    setCustomerId(id);
                    setCustomerName(name);
                  }}
                  placeholder="得意先名を入力"
                  required
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {customerId && (
          <Card>
            <CardHeader>
              <CardTitle>日報選択</CardTitle>
            </CardHeader>
            <CardContent>
              {unbilledReports.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  未請求の日報がありません
                </p>
              ) : (
                <>
                  <div className="mb-4">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedReportIds.length === unbilledReports.length
                        ? "すべて解除"
                        : "すべて選択"}
                    </Button>
                  </div>
                  <div className="border rounded-lg">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12"></TableHead>
                          <TableHead>日付</TableHead>
                          <TableHead>従業員</TableHead>
                          <TableHead>発着地</TableHead>
                          <TableHead>作業項目</TableHead>
                          <TableHead className="text-right">運賃</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {unbilledReports.map((report) => (
                          <TableRow key={report.id}>
                            <TableCell>
                              <Checkbox
                                checked={selectedReportIds.includes(report.id)}
                                onCheckedChange={() =>
                                  handleReportToggle(report.id)
                                }
                              />
                            </TableCell>
                            <TableCell>
                              {formatDate(report.reportDate)}
                            </TableCell>
                            <TableCell>{report.employee.name}</TableCell>
                            <TableCell className="text-sm">
                              {report.origin} → {report.destination}
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {parseWorkItems(report.workItems) || "-"}
                            </TableCell>
                            <TableCell className="text-right">
                              ¥{formatCurrency(report.fare)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* 手動明細入力セクション */}
        {customerId && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>手動明細入力</CardTitle>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddManualItem}
              >
                <Plus className="mr-2 h-4 w-4" />
                明細を追加
              </Button>
            </CardHeader>
            <CardContent>
              {manualItems.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">
                  手動で明細を追加できます。日報がない場合や追加の明細がある場合にご利用ください。
                </p>
              ) : (
                <div className="space-y-4">
                  {manualItems.map((item, index) => (
                    <div
                      key={item.id}
                      className="border rounded-lg p-4 space-y-4"
                    >
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-sm">明細 {index + 1}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveManualItem(item.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-4 gap-4">
                        <div className="space-y-2">
                          <Label>日付</Label>
                          <Input
                            type="date"
                            value={item.itemDate}
                            onChange={(e) =>
                              handleManualItemChange(item.id, "itemDate", e.target.value)
                            }
                          />
                        </div>
                        <div className="col-span-3 space-y-2">
                          <Label>説明（発着地、品名など）</Label>
                          <Input
                            type="text"
                            value={item.description}
                            onChange={(e) =>
                              handleManualItemChange(item.id, "description", e.target.value)
                            }
                            placeholder="例: 埼玉 → 茨城 段ボール"
                          />
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>金額（税抜）</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                            <Input
                              type="number"
                              value={item.amount}
                              onChange={(e) =>
                                handleManualItemChange(item.id, "amount", e.target.value)
                              }
                              placeholder="50000"
                              className="pl-8"
                            />
                          </div>
                        </div>
                        <div className="col-span-2 space-y-2">
                          <Label>通行料（税込）</Label>
                          <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                            <Input
                              type="number"
                              value={item.tollFee}
                              onChange={(e) =>
                                handleManualItemChange(item.id, "tollFee", e.target.value)
                              }
                              placeholder="1000"
                              className="pl-8"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {hasItems && (
          <Card>
            <CardHeader>
              <CardTitle>金額</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>小計（税抜）</span>
                  <span>¥{formatCurrency(subtotal)}</span>
                </div>
                {manualTollFeeTotal > 0 && (
                  <div className="flex justify-between text-muted-foreground">
                    <span>通行料（税込）</span>
                    <span>¥{formatCurrency(manualTollFeeTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>消費税 (10%)</span>
                  <span>¥{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-2">
                  <span>合計</span>
                  <span>¥{formatCurrency(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={loading || !hasItems}
          >
            {loading ? "作成中..." : "請求書を作成"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push("/invoices")}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}
