"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Calendar } from "lucide-react";
import { toast } from "sonner";

type ChecklistItem = {
  id: number;
  title: string;
  description: string | null;
  isCompleted: boolean;
  dueDate: string | null;
  priority: string;
  createdAt: string;
};

const priorityLabels: Record<string, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const priorityColors: Record<string, string> = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-gray-100 text-gray-800",
};

export default function ChecklistPage() {
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("medium");
  const [newDueDate, setNewDueDate] = useState("");

  const fetchItems = async () => {
    try {
      const res = await fetch("/api/checklist");
      if (res.ok) {
        setItems(await res.json());
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const res = await fetch("/api/checklist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          priority: newPriority,
          dueDate: newDueDate || null,
        }),
      });

      if (res.ok) {
        toast.success("追加しました");
        setNewTitle("");
        setNewDueDate("");
        fetchItems();
      } else {
        const data = await res.json();
        toast.error(data.error || "追加に失敗しました");
      }
    } catch (error) {
      console.error(error);
      toast.error("追加に失敗しました");
    }
  };

  const handleToggle = async (item: ChecklistItem) => {
    try {
      const res = await fetch(`/api/checklist/${item.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCompleted: !item.isCompleted }),
      });

      if (res.ok) {
        fetchItems();
      }
    } catch (error) {
      console.error(error);
      toast.error("更新に失敗しました");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("この確認事項を削除しますか？")) return;

    try {
      const res = await fetch(`/api/checklist/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("削除しました");
        fetchItems();
      }
    } catch (error) {
      console.error(error);
      toast.error("削除に失敗しました");
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const isOverdue = (dateStr: string | null) => {
    if (!dateStr) return false;
    const dueDate = new Date(dateStr);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today;
  };

  const pendingItems = items.filter((item) => !item.isCompleted);
  const completedItems = items.filter((item) => item.isCompleted);

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">確認事項</h1>
        <p className="text-muted-foreground">
          やるべきことを管理します
        </p>
      </div>

      {/* Add new item form */}
      <Card>
        <CardHeader>
          <CardTitle>新規追加</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex gap-3">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="確認事項を入力..."
              className="flex-1"
            />
            <Select value={newPriority} onValueChange={setNewPriority}>
              <SelectTrigger className="w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="high">高</SelectItem>
                <SelectItem value="medium">中</SelectItem>
                <SelectItem value="low">低</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="w-40"
            />
            <Button type="submit">
              <Plus className="mr-2 h-4 w-4" />
              追加
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Pending items */}
      <Card>
        <CardHeader>
          <CardTitle>
            未完了
            <Badge variant="secondary" className="ml-2">
              {pendingItems.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pendingItems.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              未完了の確認事項はありません
            </p>
          ) : (
            <div className="space-y-2">
              {pendingItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    checked={item.isCompleted}
                    onCheckedChange={() => handleToggle(item)}
                  />
                  <div className="flex-1">
                    <p className="font-medium">{item.title}</p>
                  </div>
                  <Badge className={priorityColors[item.priority]}>
                    {priorityLabels[item.priority]}
                  </Badge>
                  {item.dueDate && (
                    <span
                      className={`text-sm flex items-center gap-1 ${
                        isOverdue(item.dueDate) ? "text-red-600 font-bold" : "text-muted-foreground"
                      }`}
                    >
                      <Calendar className="h-3 w-3" />
                      {formatDate(item.dueDate)}
                      {isOverdue(item.dueDate) && " (期限切れ)"}
                    </span>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Completed items */}
      {completedItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>
              完了済み
              <Badge variant="outline" className="ml-2">
                {completedItems.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {completedItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30"
                >
                  <Checkbox
                    checked={item.isCompleted}
                    onCheckedChange={() => handleToggle(item)}
                  />
                  <div className="flex-1">
                    <p className="text-muted-foreground line-through">
                      {item.title}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(item.id)}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
