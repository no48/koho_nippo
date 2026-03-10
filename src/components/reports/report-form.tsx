"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { CustomerAutocomplete } from "@/components/ui/customer-autocomplete";
import { toast } from "sonner";

type Employee = {
  id: number;
  name: string;
  wageType: string | null;
};

type WageRate = {
  id: number;
  wageType: string;
  workItem: string;
  rate: number;
  sortOrder: number;
};

type Truck = {
  id: number;
  vehicleNumber: string;
  vehicleName: string;
};

type DailyReport = {
  id: number;
  reportDate: string;
  reportType: string | null;
  employeeId: number;
  truckId: number | null;
  customerId: number;
  customer?: { id: number; name: string };
  employee?: { id: number; name: string; wageType: string | null };
  origin: string;
  destination: string;
  productName: string | null;
  fare: string | number;
  salary: string | number | null;
  tollFee: string | number | null;
  distanceAllowance: string | number | null; // 距離手当
  workItems: string | null;  // JSON: ["基本給", "2回目"]
  wageType: string | null;   // 給与形態
  memo: string | null;
};

type ReportFormProps = {
  report?: DailyReport;
  isEdit?: boolean;
};

export function ReportForm({ report, isEdit = false }: ReportFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [reportTypes, setReportTypes] = useState<string[]>([]);
  const [wageRates, setWageRates] = useState<WageRate[]>([]);
  const [selectedWageType, setSelectedWageType] = useState<string>("");
  const [selectedWorkItems, setSelectedWorkItems] = useState<string[]>([]);

  const formatDateForInput = (dateStr: string | undefined) => {
    if (!dateStr) return new Date().toISOString().split("T")[0];
    return new Date(dateStr).toISOString().split("T")[0];
  };

  // 保存された作業項目をパース
  const parseWorkItems = (workItemsJson: string | null): string[] => {
    if (!workItemsJson) return [];
    try {
      return JSON.parse(workItemsJson);
    } catch {
      return [];
    }
  };

  const [formData, setFormData] = useState({
    reportDate: formatDateForInput(report?.reportDate),
    reportType: report?.reportType || "",
    employeeId: report?.employeeId?.toString() || "",
    truckId: report?.truckId?.toString() || "",
    customerId: report?.customerId?.toString() || "",
    customerName: report?.customer?.name || "",
    origin: report?.origin || "",
    destination: report?.destination || "",
    productName: report?.productName || "",
    fare: report?.fare?.toString() || "",
    salary: report?.salary?.toString() || "",
    tollFee: report?.tollFee?.toString() || "0",
    distanceAllowance: report?.distanceAllowance?.toString() || "0",
    workItems: report?.workItems || "",
    wageType: report?.wageType || "",
    memo: report?.memo || "",
  });

  // 利用可能な給与形態一覧を取得
  const getAvailableWageTypes = (): string[] => {
    const types = new Set(wageRates.map((wr) => wr.wageType));
    return Array.from(types).sort();
  };

  // 初期化: 編集時は保存された給与形態と作業項目を復元
  useEffect(() => {
    if (wageRates.length > 0) {
      // 保存された給与形態があればそれを使用
      if (report?.wageType) {
        setSelectedWageType(report.wageType);
      }
      // 作業項目を復元
      if (report?.workItems) {
        const savedWorkItems = parseWorkItems(report.workItems);
        setSelectedWorkItems(savedWorkItems);

        // 給与形態が未保存の場合のみ、作業項目から推測（後方互換性）
        if (!report?.wageType && savedWorkItems.length > 0) {
          const matchingRate = wageRates.find((wr) => savedWorkItems.includes(wr.workItem));
          if (matchingRate) {
            setSelectedWageType(matchingRate.wageType);
          }
        }
      }
    }
  }, [report, wageRates]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [employeesRes, trucksRes, settingsRes, wageRatesRes] = await Promise.all([
          fetch("/api/employees"),
          fetch("/api/trucks"),
          fetch("/api/settings"),
          fetch("/api/wage-rates"),
        ]);

        if (employeesRes.ok) {
          const data = await employeesRes.json();
          setEmployees(data);
        }
        if (trucksRes.ok) {
          const data = await trucksRes.json();
          setTrucks(data);
        }
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          if (data.reportTypes) {
            try {
              setReportTypes(JSON.parse(data.reportTypes));
            } catch {
              setReportTypes([]);
            }
          }
        }
        if (wageRatesRes.ok) {
          const data = await wageRatesRes.json();
          setWageRates(data);
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      }
    };
    fetchData();
  }, []);

  // 給与形態が変更されたとき、作業項目をリセット
  const handleWageTypeChange = (newWageType: string) => {
    if (newWageType !== selectedWageType) {
      setSelectedWageType(newWageType);
      setSelectedWorkItems([]);
    }
  };

  // 選択された給与形態の作業項目を取得
  const getWorkItemsForWageType = () => {
    return wageRates.filter((wr) => wr.wageType === selectedWageType);
  };

  // 作業項目の選択/解除
  const handleWorkItemToggle = (workItem: string) => {
    setSelectedWorkItems((prev) =>
      prev.includes(workItem)
        ? prev.filter((item) => item !== workItem)
        : [...prev, workItem]
    );
  };

  // 給与の自動計算
  const calculateSalary = (): number => {
    return getWorkItemsForWageType()
      .filter((wr) => selectedWorkItems.includes(wr.workItem))
      .reduce((sum, wr) => sum + Number(wr.rate), 0);
  };

  // 作業項目または給与形態が変更されたとき、給与を自動計算
  useEffect(() => {
    // 給与形態は常にformDataに反映
    setFormData((prev) => ({
      ...prev,
      wageType: selectedWageType,
    }));

    // 作業項目が選択されていれば給与を計算
    if (selectedWorkItems.length > 0 && selectedWageType) {
      const calculatedSalary = calculateSalary();
      setFormData((prev) => ({
        ...prev,
        salary: calculatedSalary.toString(),
        workItems: JSON.stringify(selectedWorkItems),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkItems, selectedWageType, wageRates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const url = isEdit ? `/api/reports/${report?.id}` : "/api/reports";
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

      toast.success(isEdit ? "日報を更新しました" : "日報を登録しました");
      router.push("/reports");
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="reportDate">
                日付 <span className="text-destructive">*</span>
              </Label>
              <Input
                id="reportDate"
                type="date"
                value={formData.reportDate}
                onChange={(e) =>
                  setFormData({ ...formData, reportDate: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customerId">
                得意先 <span className="text-destructive">*</span>
              </Label>
              <CustomerAutocomplete
                id="customerId"
                value={formData.customerName}
                onSelect={(customerId, customerName) =>
                  setFormData({ ...formData, customerId, customerName })
                }
                placeholder="得意先名を入力"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="employeeId">
                従業員 <span className="text-destructive">*</span>
              </Label>
              <Select
                value={formData.employeeId}
                onValueChange={(value) =>
                  setFormData({ ...formData, employeeId: value })
                }
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="従業員を選択" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((employee) => (
                    <SelectItem key={employee.id} value={employee.id.toString()}>
                      {employee.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="truckId">トラック</Label>
              <Select
                value={formData.truckId || "_none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, truckId: value === "_none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="トラックを選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">（未選択）</SelectItem>
                  {trucks.map((truck) => (
                    <SelectItem key={truck.id} value={truck.id.toString()}>
                      {truck.vehicleNumber} ({truck.vehicleName})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>配送情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 日報種類 */}
          {reportTypes.length > 0 && (
            <div className="space-y-2">
              <Label htmlFor="reportType">種類</Label>
              <Select
                value={formData.reportType || "_none"}
                onValueChange={(value) =>
                  setFormData({ ...formData, reportType: value === "_none" ? "" : value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">（未選択）</SelectItem>
                  {reportTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* 給与形態・作業内容選択 */}
          {getAvailableWageTypes().length > 0 && (
            <div className="space-y-3 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center gap-4">
                <Label className="shrink-0">給与形態</Label>
                <Select
                  value={selectedWageType || "_none"}
                  onValueChange={(value) => handleWageTypeChange(value === "_none" ? "" : value)}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="選択してください" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">（未選択）</SelectItem>
                    {getAvailableWageTypes().map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* 作業内容 - 給与形態が選択されている場合のみ表示 */}
              {selectedWageType && getWorkItemsForWageType().length > 0 && (
                <>
                  <div className="space-y-2">
                    <Label>作業内容</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                      {getWorkItemsForWageType().map((wr) => (
                        <label
                          key={wr.id}
                          className={`flex items-center justify-between p-2 border rounded-lg cursor-pointer transition-colors text-sm ${
                            selectedWorkItems.includes(wr.workItem)
                              ? "bg-primary/10 border-primary"
                              : "bg-background hover:bg-muted/50"
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={selectedWorkItems.includes(wr.workItem)}
                              onChange={() => handleWorkItemToggle(wr.workItem)}
                              className="rounded border-gray-300"
                            />
                            <span>{wr.workItem}</span>
                          </div>
                          <span className="text-muted-foreground">
                            ¥{Number(wr.rate).toLocaleString()}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {selectedWorkItems.length > 0 && (
                    <div className="flex items-center justify-between pt-2 border-t">
                      <span className="text-sm text-muted-foreground">
                        選択中: {selectedWorkItems.join("、")}
                      </span>
                      <span className="font-semibold text-primary">
                        給与: ¥{calculateSalary().toLocaleString()}
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="origin">
                発地 <span className="text-destructive">*</span>
              </Label>
              <AutocompleteInput
                id="origin"
                value={formData.origin}
                onChange={(value) => setFormData({ ...formData, origin: value })}
                placeholder="例: 埼玉県杉戸町 平田倉庫㈱"
                field="origin"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="destination">
                着地 <span className="text-destructive">*</span>
              </Label>
              <AutocompleteInput
                id="destination"
                value={formData.destination}
                onChange={(value) =>
                  setFormData({ ...formData, destination: value })
                }
                placeholder="例: 茨城県常総市 王子コンテナー㈱"
                field="destination"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="productName">品名</Label>
            <Input
              id="productName"
              value={formData.productName}
              onChange={(e) =>
                setFormData({ ...formData, productName: e.target.value })
              }
              placeholder="例: OND-EM/OND-EM/OFC-EM"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>金額情報</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fare">
                運賃（税抜） <span className="text-destructive">*</span>
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="fare"
                  type="number"
                  value={formData.fare}
                  onChange={(e) =>
                    setFormData({ ...formData, fare: e.target.value })
                  }
                  placeholder="50000"
                  className="pl-8"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="salary">
                給与
                {selectedWorkItems.length > 0 && (
                  <span className="text-xs text-muted-foreground ml-2">
                    （作業内容から自動計算）
                  </span>
                )}
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="salary"
                  type="number"
                  value={formData.salary}
                  onChange={(e) =>
                    setFormData({ ...formData, salary: e.target.value })
                  }
                  placeholder="35000"
                  className={`pl-8 ${selectedWorkItems.length > 0 ? "bg-muted" : ""}`}
                />
              </div>
              {!selectedWageType && (
                <p className="text-xs text-muted-foreground">
                  従業員に給与形態が設定されていれば自動計算されます
                </p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tollFee">通行料（税込）</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="tollFee"
                  type="number"
                  value={formData.tollFee}
                  onChange={(e) =>
                    setFormData({ ...formData, tollFee: e.target.value })
                  }
                  placeholder="3000"
                  className="pl-8"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="distanceAllowance">距離手当</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                <Input
                  id="distanceAllowance"
                  type="number"
                  value={formData.distanceAllowance}
                  onChange={(e) =>
                    setFormData({ ...formData, distanceAllowance: e.target.value })
                  }
                  placeholder="1000"
                  className="pl-8"
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="memo">備考</Label>
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
          onClick={() => router.push("/reports")}
        >
          キャンセル
        </Button>
      </div>
    </form>
  );
}
