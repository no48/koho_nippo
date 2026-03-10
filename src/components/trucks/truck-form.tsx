"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";

type Employee = {
  id: number;
  name: string;
  nameKana: string;
};

type Truck = {
  id: number;
  vehicleNumber: string;
  vehicleName: string;
  memo: string | null;
  employees: { employee: Employee }[];
};

type TruckFormProps = {
  truck?: Truck;
  isEdit?: boolean;
};

export function TruckForm({ truck, isEdit = false }: TruckFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [formData, setFormData] = useState({
    vehicleNumber: truck?.vehicleNumber || "",
    vehicleName: truck?.vehicleName || "",
    memo: truck?.memo || "",
    employeeIds: truck?.employees.map((e) => e.employee.id) || [],
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const response = await fetch("/api/employees");
        if (response.ok) {
          const data = await response.json();
          setEmployees(data);
        }
      } catch (error) {
        console.error("Failed to fetch employees:", error);
      }
    };
    fetchEmployees();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/trucks/${truck?.id}` : "/api/trucks";
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

      toast.success(isEdit ? "トラックを更新しました" : "トラックを登録しました");
      router.push("/trucks");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  const handleEmployeeToggle = (employeeId: number) => {
    setFormData((prev) => ({
      ...prev,
      employeeIds: prev.employeeIds.includes(employeeId)
        ? prev.employeeIds.filter((id) => id !== employeeId)
        : [...prev.employeeIds, employeeId],
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>基本情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="vehicleNumber">
              車両番号 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vehicleNumber"
              value={formData.vehicleNumber}
              onChange={(e) =>
                setFormData({ ...formData, vehicleNumber: e.target.value })
              }
              placeholder="例: 熊谷 100 あ 1234"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="vehicleName">
              車種名 <span className="text-destructive">*</span>
            </Label>
            <Input
              id="vehicleName"
              value={formData.vehicleName}
              onChange={(e) =>
                setFormData({ ...formData, vehicleName: e.target.value })
              }
              placeholder="例: 4tウイング"
              required
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

      {employees.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>担当従業員</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {employees.map((employee) => (
                <label
                  key={employee.id}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.employeeIds.includes(employee.id)}
                    onChange={() => handleEmployeeToggle(employee.id)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm">{employee.name}</span>
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
          onClick={() => router.push("/trucks")}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
