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
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Employee = {
  id: number;
  name: string;
};

type TruckEmployee = {
  employee: Employee;
};

type Truck = {
  id: number;
  vehicleNumber: string;
  vehicleName: string;
  memo: string | null;
  employees: TruckEmployee[];
  createdAt: string;
};

export default function TrucksPage() {
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const fetchTrucks = async () => {
    try {
      const response = await fetch("/api/trucks");
      if (!response.ok) throw new Error("Failed to fetch");
      const data = await response.json();
      setTrucks(data);
    } catch (error) {
      console.error(error);
      toast.error("トラックの取得に失敗しました");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrucks();
  }, []);

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      const response = await fetch(`/api/trucks/${deleteId}`, {
        method: "DELETE",
      });

      if (!response.ok) throw new Error("Failed to delete");

      toast.success("トラックを削除しました");
      fetchTrucks();
    } catch (error) {
      console.error(error);
      toast.error("削除に失敗しました");
    } finally {
      setDeleteId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">トラック一覧</h1>
          <p className="text-muted-foreground">社内トラックを管理します</p>
        </div>
        <Button asChild>
          <Link href="/trucks/new">
            <Plus className="mr-2 h-4 w-4" />
            新規登録
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-8">読み込み中...</div>
      ) : trucks.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          トラックが登録されていません
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>車両番号</TableHead>
                <TableHead>車種名</TableHead>
                <TableHead>担当従業員</TableHead>
                <TableHead>メモ</TableHead>
                <TableHead className="w-[100px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trucks.map((truck) => (
                <TableRow key={truck.id}>
                  <TableCell className="font-medium">
                    {truck.vehicleNumber}
                  </TableCell>
                  <TableCell>{truck.vehicleName}</TableCell>
                  <TableCell>
                    {truck.employees.length > 0
                      ? truck.employees.map((te) => te.employee.name).join(", ")
                      : "-"}
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">
                    {truck.memo || "-"}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/trucks/${truck.id}/edit`}>
                          <Pencil className="h-4 w-4" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteId(truck.id)}
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
            <DialogTitle>トラックを削除しますか？</DialogTitle>
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
