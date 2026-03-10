"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Customer = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  memo: string | null;
};

type CustomerFormProps = {
  customer?: Customer;
  isEdit?: boolean;
};

export function CustomerForm({ customer, isEdit = false }: CustomerFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: customer?.name || "",
    address: customer?.address || "",
    phone: customer?.phone || "",
    email: customer?.email || "",
    contactPerson: customer?.contactPerson || "",
    memo: customer?.memo || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/customers/${customer?.id}` : "/api/customers";
      const method = isEdit ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "エラーが発生しました");
      }

      toast.success(isEdit ? "得意先を更新しました" : "得意先を登録しました");
      router.push("/customers");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">
              得意先名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              placeholder="例: 株式会社〇〇"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">住所</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
              placeholder="例: 東京都千代田区..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">電話番号</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) =>
                  setFormData({ ...formData, phone: e.target.value })
                }
                placeholder="例: 03-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="contactPerson">担当者</Label>
              <Input
                id="contactPerson"
                value={formData.contactPerson}
                onChange={(e) =>
                  setFormData({ ...formData, contactPerson: e.target.value })
                }
                placeholder="例: 山田 太郎"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">メールアドレス（請求書送付先）</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder="例: keiri@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">メモ</Label>
            <Textarea
              id="memo"
              value={formData.memo}
              onChange={(e) =>
                setFormData({ ...formData, memo: e.target.value })
              }
              placeholder="備考があれば入力してください"
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "保存中..." : isEdit ? "更新" : "登録"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/customers")}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
