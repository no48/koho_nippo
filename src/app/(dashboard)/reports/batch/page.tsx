"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { CustomerAutocomplete } from "@/components/ui/customer-autocomplete";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";

type Employee = { id: number; name: string };
type Truck = { id: number; vehicleNumber: string; vehicleName: string };

type Row = {
  uid: string;
  customerId: string;
  customerName: string;
  origin: string;
  destination: string;
  destinationAddress: string;
  productName: string;
  quantity: string;
  salary: string;
  fare: string;
  tollFee: string;
  distanceAllowance: string;
  wageType: string;
};

let rowCounter = 0;
const newRow = (): Row => ({
  uid: `row-${rowCounter++}`,
  customerId: "", customerName: "", origin: "", destination: "",
  destinationAddress: "", productName: "", quantity: "", salary: "",
  fare: "", tollFee: "0", distanceAllowance: "0", wageType: "",
});

// 完全な空行（必須3項目がすべて空）かどうか
const isBlankRow = (r: Row): boolean =>
  !r.customerId && !r.origin && !r.destination && !r.destinationAddress &&
  !r.productName && !r.quantity && !r.salary && !r.fare &&
  r.tollFee === "0" && r.distanceAllowance === "0" && !r.wageType;

export default function BatchReportPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [wageTypes, setWageTypes] = useState<string[]>([]);

  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [employeeId, setEmployeeId] = useState("");
  const [truckId, setTruckId] = useState("");
  const [rows, setRows] = useState<Row[]>([newRow()]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [empRes, truckRes, wageRes] = await Promise.all([
          fetch("/api/employees"),
          fetch("/api/trucks"),
          fetch("/api/wage-rates"),
        ]);
        if (empRes.ok) setEmployees(await empRes.json());
        if (truckRes.ok) setTrucks(await truckRes.json());
        if (wageRes.ok) {
          const data = await wageRes.json();
          setWageTypes([...new Set<string>(data.map((w: { wageType: string }) => w.wageType))].sort());
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  const updateRow = (uid: string, field: keyof Row, value: string) => {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, newRow()]);
  const removeRow = (uid: string) =>
    setRows((prev) => (prev.length > 1 ? prev.filter((r) => r.uid !== uid) : prev));

  // 送信前のチェック: 入力された行に必須項目が揃っているか検証し、
  // 問題があればエラーメッセージ(文字列)を返す。OKなら null を返す。
  const validateRows = (filledRows: Row[]): string | null => {
    if (filledRows.length === 0) {
      return "明細を1行以上入力してください";
    }
    for (const r of filledRows) {
      if (!r.customerId || !r.origin || !r.destination) {
        // 画面の表示と一致するよう、元の行配列での位置で「○行目」を示す
        const lineNo = rows.indexOf(r) + 1;
        return `${lineNo}行目: 得意先・発地・着地は必須です`;
      }
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!employeeId) {
      toast.error("従業員を選択してください");
      return;
    }

    const filledRows = rows.filter((r) => !isBlankRow(r));
    const validationError = validateRows(filledRows);
    if (validationError) {
      toast.error(validationError);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/reports/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate,
          employeeId,
          truckId: truckId || null,
          rows: filledRows.map((r) => ({
            customerId: r.customerId,
            origin: r.origin,
            destination: r.destination,
            destinationAddress: r.destinationAddress,
            productName: r.productName,
            quantity: r.quantity,
            salary: r.salary,
            fare: r.fare,
            tollFee: r.tollFee,
            distanceAllowance: r.distanceAllowance,
            wageType: r.wageType,
          })),
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "エラーが発生しました");
      }
      const data = await res.json();
      toast.success(`${data.count}件の日報を登録しました`);
      router.push("/reports");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">日報まとめ入力</h1>
        <p className="text-muted-foreground">同じ従業員・日付の配送を複数行まとめて登録します</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader><CardTitle>共通情報</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reportDate">日付 <span className="text-destructive">*</span></Label>
                <Input id="reportDate" type="date" value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>従業員 <span className="text-destructive">*</span></Label>
                <Select value={employeeId} onValueChange={setEmployeeId} required>
                  <SelectTrigger><SelectValue placeholder="従業員を選択" /></SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>{emp.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>トラック</Label>
                <Select value={truckId || "_none"}
                  onValueChange={(v) => setTruckId(v === "_none" ? "" : v)}>
                  <SelectTrigger><SelectValue placeholder="トラックを選択" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_none">（未選択）</SelectItem>
                    {trucks.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.vehicleNumber} ({t.vehicleName})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>明細（{rows.length}行）</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />行を追加
            </Button>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-2 min-w-[160px]">得意先</th>
                  <th className="p-2 min-w-[140px]">発地</th>
                  <th className="p-2 min-w-[140px]">着地</th>
                  <th className="p-2 min-w-[160px]">着地の住所</th>
                  <th className="p-2 min-w-[120px]">品名</th>
                  <th className="p-2 w-20">数量</th>
                  <th className="p-2 w-24">給与</th>
                  <th className="p-2 w-24">運賃</th>
                  <th className="p-2 w-24">通行料</th>
                  <th className="p-2 w-24">距離手当</th>
                  <th className="p-2 min-w-[120px]">給与形態</th>
                  <th className="p-2 w-10"></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.uid} className="border-b align-top">
                    <td className="p-1">
                      <CustomerAutocomplete id={`cust-${r.uid}`} value={r.customerName}
                        onSelect={(id, name) => {
                          updateRow(r.uid, "customerId", id);
                          updateRow(r.uid, "customerName", name);
                        }}
                        placeholder="得意先" />
                    </td>
                    <td className="p-1">
                      <AutocompleteInput id={`origin-${r.uid}`} value={r.origin}
                        onChange={(v) => updateRow(r.uid, "origin", v)} field="origin" placeholder="発地" />
                    </td>
                    <td className="p-1">
                      <AutocompleteInput id={`dest-${r.uid}`} value={r.destination}
                        onChange={(v) => updateRow(r.uid, "destination", v)} field="destination" placeholder="着地" />
                    </td>
                    <td className="p-1">
                      <Input value={r.destinationAddress}
                        onChange={(e) => updateRow(r.uid, "destinationAddress", e.target.value)} placeholder="住所" />
                    </td>
                    <td className="p-1">
                      <Input value={r.productName}
                        onChange={(e) => updateRow(r.uid, "productName", e.target.value)} placeholder="品名" />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.quantity}
                        onChange={(e) => updateRow(r.uid, "quantity", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.salary}
                        onChange={(e) => updateRow(r.uid, "salary", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.fare}
                        onChange={(e) => updateRow(r.uid, "fare", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.tollFee}
                        onChange={(e) => updateRow(r.uid, "tollFee", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Input type="number" value={r.distanceAllowance}
                        onChange={(e) => updateRow(r.uid, "distanceAllowance", e.target.value)} />
                    </td>
                    <td className="p-1">
                      <Select value={r.wageType || "_none"}
                        onValueChange={(v) => updateRow(r.uid, "wageType", v === "_none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="形態" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">（未選択）</SelectItem>
                          {wageTypes.map((wt) => (
                            <SelectItem key={wt} value={wt}>{wt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="p-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => removeRow(r.uid)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "登録中..." : "まとめて登録"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/reports")}>
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}
