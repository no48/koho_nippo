"use client";

import { useEffect, useState } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Plus, Pencil, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";

type Customer = {
  id: number;
  name: string;
};

type InvoiceItem = {
  id: number;
  description: string;
  amount: number;
};

type Invoice = {
  id: number;
  invoiceNumber: string;
  customer: Customer;
  issueDate: string;
  subtotal: string | number;
  tax: string | number;
  total: string | number;
  status: string;
  items: InvoiceItem[];
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchInvoices = async () => {
    try {
      const response = await fetch("/api/invoices");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setInvoices(data);
    } catch (error) {
      console.error(error);
      toast.error("請求書の取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/invoices/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("請求書を削除しました");
      fetchInvoices();
    } catch (error) {
      console.error(error);
      toast.error("削除に失敗しました");
    } finally {
      setDeleteId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseInt(amount) : amount;
    return num.toLocaleString("ja-JP");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">請求書一覧</h1>
          <p className="text-muted-foreground">請求書を管理します</p>
        </div>
        <Button asChild>
          <Link href="/invoices/new">
            <Plus className="mr-2 h-4 w-4" />
            新規作成
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          請求書がありません
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>請求書番号</TableHead>
                <TableHead>得意先</TableHead>
                <TableHead>発行日</TableHead>
                <TableHead className="text-right">合計金額</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead className="w-[120px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map((invoice) => (
                <TableRow key={invoice.id}>
                  <TableCell className="font-medium">
                    {invoice.invoiceNumber}
                  </TableCell>
                  <TableCell>{invoice.customer.name}</TableCell>
                  <TableCell>{formatDate(invoice.issueDate)}</TableCell>
                  <TableCell className="text-right">
                    ¥{formatCurrency(invoice.total)}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        invoice.status === "issued" ? "default" : "secondary"
                      }
                    >
                      {invoice.status === "issued" ? "発行済" : "下書き"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/invoices/${invoice.id}`}>
                          <FileText className="h-4 w-4" />
                        </Link>
                      </Button>
                      {invoice.status === "draft" && (
                        <>
                          <Button variant="ghost" size="icon" asChild>
                            <Link href={`/invoices/${invoice.id}/edit`}>
                              <Pencil className="h-4 w-4" />
                            </Link>
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteId(invoice.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
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
            <DialogTitle>請求書を削除しますか？</DialogTitle>
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
