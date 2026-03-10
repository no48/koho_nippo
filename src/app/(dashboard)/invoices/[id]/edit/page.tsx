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
import { Trash2, Plus } from "lucide-react";
import { toast } from "sonner";

type Customer = {
  id: number;
  name: string;
};

type InvoiceItem = {
  id?: number;
  dailyReportId?: number | null;
  itemDate: string;
  description: string;
  amount: number;
  tollFee: number;
};

type Invoice = {
  id: number;
  invoiceNumber: string;
  customer: Customer;
  issueDate: string;
  items: InvoiceItem[];
};

export default function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [issueDate, setIssueDate] = useState("");
  const [items, setItems] = useState<InvoiceItem[]>([]);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const response = await fetch(`/api/invoices/${id}`);
        if (response.ok) {
          const data = await response.json();
          setInvoice(data);
          setIssueDate(new Date(data.issueDate).toISOString().split("T")[0]);
          setItems(
            data.items.map((item: InvoiceItem & { amount: string | number; tollFee?: string | number | null; itemDate?: string }) => ({
              ...item,
              itemDate: item.itemDate ? new Date(item.itemDate).toISOString().split("T")[0] : new Date(data.issueDate).toISOString().split("T")[0],
              amount:
                typeof item.amount === "string"
                  ? parseInt(item.amount)
                  : item.amount,
              tollFee:
                typeof item.tollFee === "string"
                  ? parseInt(item.tollFee)
                  : (item.tollFee ?? 0),
            }))
          );
        }
      } catch (error) {
        console.error("Failed to fetch invoice:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [id]);

  const handleItemChange = (
    index: number,
    field: keyof InvoiceItem,
    value: string | number
  ) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, [field]: (field === "amount" || field === "tollFee") ? parseInt(value as string) || 0 : value }
          : item
      )
    );
  };

  const handleAddItem = () => {
    setItems((prev) => [...prev, { itemDate: issueDate, description: "", amount: 0, tollFee: 0 }]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("ja-JP");
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const tollFeeTotal = items.reduce((sum, item) => sum + (item.tollFee || 0), 0);
  const tax = Math.floor(subtotal * 0.1);
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (items.length === 0) {
      toast.error("明細を1件以上追加してください");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch(`/api/invoices/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          issueDate,
          items: items.map((item) => ({
            dailyReportId: item.dailyReportId,
            itemDate: item.itemDate,
            description: item.description,
            amount: item.amount,
            tollFee: item.tollFee,
          })),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "エラーが発生しました");
      }

      toast.success("請求書を更新しました");
      router.push(`/invoices/${id}`);
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

  if (!invoice) {
    return <div className="text-center py-8">請求書が見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">請求書編集</h1>
        <p className="text-muted-foreground">
          請求書番号: {invoice.invoiceNumber}
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
                <Label>得意先</Label>
                <Input value={invoice.customer.name} disabled />
              </div>
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
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>明細</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={handleAddItem}>
                <Plus className="mr-2 h-4 w-4" />
                行を追加
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-32">日付</TableHead>
                    <TableHead>内容</TableHead>
                    <TableHead className="w-32">金額</TableHead>
                    <TableHead className="w-32">通行料（税込）</TableHead>
                    <TableHead className="w-16"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Input
                          type="date"
                          value={item.itemDate}
                          onChange={(e) =>
                            handleItemChange(index, "itemDate", e.target.value)
                          }
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(index, "description", e.target.value)
                          }
                          placeholder="内容を入力"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                          <Input
                            type="number"
                            value={item.amount}
                            onChange={(e) =>
                              handleItemChange(index, "amount", e.target.value)
                            }
                            placeholder="0"
                            className="pl-8"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                          <Input
                            type="number"
                            value={item.tollFee}
                            onChange={(e) =>
                              handleItemChange(index, "tollFee", e.target.value)
                            }
                            placeholder="0"
                            className="pl-8"
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(index)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

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
              {tollFeeTotal > 0 && (
                <div className="flex justify-between text-muted-foreground">
                  <span>通行料（税込）</span>
                  <span>¥{formatCurrency(tollFeeTotal)}</span>
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

        <div className="flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "保存中..." : "保存"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(`/invoices/${id}`)}
          >
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}
