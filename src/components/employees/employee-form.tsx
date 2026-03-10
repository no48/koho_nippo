"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

// 給与形態の種類
const WAGE_TYPES = ["大型", "常用", "大型2", "大型3", "4t", "フォーク作業", "ライトバン"];

type Truck = {
  id: number;
  vehicleNumber: string;
  vehicleName: string;
};

type Employee = {
  id: number;
  name: string;
  nameKana: string;
  phone: string | null;
  memo: string | null;
  baseSalary: string | number | null;
  wageType: string | null;
  trucks: { truck: Truck }[];
};

type EmployeeFormProps = {
  employee?: Employee;
  isEdit?: boolean;
};

export function EmployeeForm({ employee, isEdit = false }: EmployeeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [formData, setFormData] = useState({
    name: employee?.name || "",
    nameKana: employee?.nameKana || "",
    phone: employee?.phone || "",
    baseSalary: employee?.baseSalary?.toString() || "",
    wageType: employee?.wageType || "",
    memo: employee?.memo || "",
    truckIds: employee?.trucks.map((t) => t.truck.id) || [],
  });

  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const response = await fetch("/api/trucks");
        if (response.ok) {
          const data = await response.json();
          setTrucks(data);
        }
      } catch (error) {
        console.error("Failed to fetch trucks:", error);
      }
    };
    fetchTrucks();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/employees/${employee?.id}` : "/api/employees";
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

      toast.success(isEdit ? "従業員を更新しました" : "従業員を登録しました");
      router.push("/employees");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleTruckToggle = (truckId: number) => {
    setFormData((prev) => ({
      ...prev,
      truckIds: prev.truckIds.includes(truckId)
        ? prev.truckIds.filter((id) => id !== truckId)
        : [...prev.truckIds, truckId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                氏名 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="例: 山田 太郎"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="nameKana">
                フリガナ <span className="text-destructive">*</span>
              </Label>
              <Input
                id="nameKana"
                value={formData.nameKana}
                onChange={(e) =>
                  setFormData({ ...formData, nameKana: e.target.value })
                }
                placeholder="例: ヤマダ タロウ"
                required
              />
            </div>
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
                placeholder="例: 090-1234-5678"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="wageType">給与形態</Label>
              <Select
                value={formData.wageType || "_none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, wageType: value === "_none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="給与形態を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">（未設定）</SelectItem>
                  {WAGE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="baseSalary">基本給（月額）</Label>
              <Input
                id="baseSalary"
                type="number"
                value={formData.baseSalary}
                onChange={(e) =>
                  setFormData({ ...formData, baseSalary: e.target.value })
                }
                placeholder="例: 300000"
              />
              <p className="text-xs text-muted-foreground">
                日報の給与は単価マスタから自動計算されます
              </p>
            </div>
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

      {trucks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>担当トラック</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {trucks.map((truck) => (
                <label
                  key={truck.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.truckIds.includes(truck.id)}
                    onChange={() => handleTruckToggle(truck.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{truck.vehicleNumber}</span>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-4">
        <Button type="submit" disabled={loading}>
          {loading ? "保存中..." : isEdit ? "更新" : "登録"}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/employees")}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
