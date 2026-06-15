"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { CustomerAutocomplete } from "@/components/ui/customer-autocomplete";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown } from "lucide-react";

type Employee = { id: number; name: string; isActive?: boolean };
type Truck = { id: number; vehicleNumber: string; vehicleName: string; isActive?: boolean };
type WageRate = { id: number; wageType: string; workItem: string; rate: number; sortOrder: number };

type Row = {
  uid: string;
  customerId: string;
  customerName: string;
  originAddress: string;
  origin: string;
  destinationAddress: string;
  destination: string;
  productName: string;
  quantity: string;
  salary: string;
  fare: string;
  tollFee: string;
  distanceAllowance: string;
  wageType: string;
  workItems: string[];
};

let rowCounter = 0;
const newRow = (): Row => ({
  uid: `row-${rowCounter++}`,
  customerId: "", customerName: "", originAddress: "", origin: "",
  destinationAddress: "", destination: "", productName: "", quantity: "", salary: "",
  fare: "", tollFee: "0", distanceAllowance: "0", wageType: "", workItems: [],
});

// 完全な空行（必須3項目がすべて空）かどうか
const isBlankRow = (r: Row): boolean =>
  !r.customerId && !r.originAddress && !r.origin && !r.destinationAddress && !r.destination &&
  !r.productName && !r.quantity && !r.salary && !r.fare &&
  r.tollFee === "0" && r.distanceAllowance === "0" && !r.wageType &&
  r.workItems.length === 0;

const parseWorkItems = (json: string | null | undefined): string[] => {
  if (!json) return [];
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
};

// カード内のラベル付き入力セル（横スクロールせず画面幅で折り返すための単位）
function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground">
        {label}
        {required && <span className="text-destructive"> *</span>}
      </Label>
      {children}
    </div>
  );
}

export default function BatchReportPage() {
  return (
    <Suspense fallback={<div className="text-center py-8">読み込み中...</div>}>
      <BatchReportContent />
    </Suspense>
  );
}

function BatchReportContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");
  const isEdit = !!editId;

  const [loading, setLoading] = useState(false);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [wageRates, setWageRates] = useState<WageRate[]>([]);

  const [reportDate, setReportDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [employeeId, setEmployeeId] = useState("");
  const [truckId, setTruckId] = useState("");
  // 初期化は関数形式で1回だけ実行（毎レンダリングでの採番ズレ＝ハイドレーション不一致を防ぐ）
  const [rows, setRows] = useState<Row[]>(() => [newRow()]);
  // 編集モードで「更新対象」になる元の行のuid（追加行はこれと異なる＝新規作成扱い）
  const [originalUid, setOriginalUid] = useState<string | null>(null);
  // 編集対象の日報が持つ従業員/トラック。無効(isActive=false)だと一覧APIに含まれないため、
  // 選択肢に確実に出すために別stateで保持し、描画時にマージする（一覧取得との競合を回避）。
  const [editEmployee, setEditEmployee] = useState<Employee | null>(null);
  const [editTruck, setEditTruck] = useState<Truck | null>(null);
  // 編集時、従業員/トラックの選択値は「選択肢にその項目が現れてから」セットする。
  // 同一コミットで値とSelectItemを同時追加するとRadix Selectが項目登録の遅れで
  // 値を空にリセットしてしまうため（無効従業員の編集で発生）、保留してeffectで確定する。
  const [pendingEmployeeId, setPendingEmployeeId] = useState<string | null>(null);
  const [pendingTruckId, setPendingTruckId] = useState<string | null>(null);

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
        if (wageRes.ok) setWageRates(await wageRes.json());
      } catch (e) {
        console.error(e);
      }
    };
    fetchData();
  }, []);

  // 編集モード: 対象の日報を読み込んで1行に展開（その行が更新対象）
  useEffect(() => {
    if (!editId) return;
    const fetchReport = async () => {
      try {
        const res = await fetch(`/api/reports/${editId}`);
        if (!res.ok) return;
        const r = await res.json();
        const uid = `row-${rowCounter++}`;
        setOriginalUid(uid);
        setReportDate(new Date(r.reportDate).toISOString().split("T")[0]);
        // report取得時点で従業員/トラックの実体(include)が手に入るので先に保持（選択肢を確定させる）
        if (r.employee)
          setEditEmployee({ id: r.employee.id, name: r.employee.name, isActive: r.employee.isActive });
        if (r.truck)
          setEditTruck({
            id: r.truck.id,
            vehicleNumber: r.truck.vehicleNumber,
            vehicleName: r.truck.vehicleName,
            isActive: r.truck.isActive,
          });
        // 値は保留。選択肢に項目が現れてからeffectで確定する
        setPendingEmployeeId(r.employeeId?.toString() || "");
        setPendingTruckId(r.truckId?.toString() || "");
        setRows([
          {
            uid,
            customerId: r.customerId?.toString() || "",
            customerName: r.customer?.name || "",
            originAddress: r.originAddress || "",
            origin: r.origin || "",
            destinationAddress: r.destinationAddress || "",
            destination: r.destination || "",
            productName: r.productName || "",
            quantity: r.quantity != null ? String(r.quantity) : "",
            salary: r.salary != null ? String(r.salary) : "",
            fare: r.fare != null ? String(r.fare) : "",
            tollFee: r.tollFee != null ? String(r.tollFee) : "0",
            distanceAllowance: r.distanceAllowance != null ? String(r.distanceAllowance) : "0",
            wageType: r.wageType || "",
            workItems: parseWorkItems(r.workItems),
          },
        ]);
      } catch (e) {
        console.error(e);
      }
    };
    fetchReport();
  }, [editId]);

  // 編集対象の従業員/トラックが無効で一覧に居ない場合だけ、先頭に足して選択肢に出す
  const employeeOptions =
    editEmployee && !employees.some((e) => e.id === editEmployee.id)
      ? [editEmployee, ...employees]
      : employees;
  const truckOptions =
    editTruck && !trucks.some((t) => t.id === editTruck.id)
      ? [editTruck, ...trucks]
      : trucks;

  // 保留中の選択値を、対応する選択肢が出揃ってから確定する（Radixのリセット回避）。
  // 空("")＝未選択はそのまま即確定してよい。
  useEffect(() => {
    if (pendingEmployeeId === null) return;
    if (pendingEmployeeId === "" || employeeOptions.some((e) => String(e.id) === pendingEmployeeId)) {
      setEmployeeId(pendingEmployeeId);
      setPendingEmployeeId(null);
    }
  }, [pendingEmployeeId, employeeOptions]);
  useEffect(() => {
    if (pendingTruckId === null) return;
    if (pendingTruckId === "" || truckOptions.some((t) => String(t.id) === pendingTruckId)) {
      setTruckId(pendingTruckId);
      setPendingTruckId(null);
    }
  }, [pendingTruckId, truckOptions]);

  // 給与形態の一覧（重複排除）
  const wageTypes = [...new Set(wageRates.map((w) => w.wageType))].sort();
  // 指定給与形態の作業内容一覧
  const itemsForWageType = (wageType: string) =>
    wageRates.filter((w) => w.wageType === wageType);
  // 給与形態＋選択作業内容から給与を合算
  const computeSalary = (wageType: string, workItems: string[]) =>
    wageRates
      .filter((w) => w.wageType === wageType && workItems.includes(w.workItem))
      .reduce((sum, w) => sum + Number(w.rate), 0);

  const updateRow = (uid: string, field: keyof Row, value: string) => {
    setRows((prev) => prev.map((r) => (r.uid === uid ? { ...r, [field]: value } : r)));
  };

  // 給与形態を変更したら作業内容と給与をリセット
  const changeWageType = (uid: string, wageType: string) => {
    setRows((prev) =>
      prev.map((r) => (r.uid === uid ? { ...r, wageType, workItems: [], salary: "" } : r))
    );
  };

  // 作業内容のON/OFFで給与を自動再計算
  const toggleWorkItem = (uid: string, workItem: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.uid !== uid) return r;
        const workItems = r.workItems.includes(workItem)
          ? r.workItems.filter((w) => w !== workItem)
          : [...r.workItems, workItem];
        const salary = computeSalary(r.wageType, workItems);
        // 作業内容が1つでも選ばれていれば自動計算値を反映、空なら手入力値を維持
        return { ...r, workItems, salary: workItems.length > 0 ? String(salary) : r.salary };
      })
    );
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

  const rowPayload = (r: Row) => ({
    customerId: r.customerId,
    originAddress: r.originAddress,
    origin: r.origin,
    destinationAddress: r.destinationAddress,
    destination: r.destination,
    productName: r.productName,
    quantity: r.quantity,
    salary: r.salary,
    fare: r.fare,
    tollFee: r.tollFee,
    distanceAllowance: r.distanceAllowance,
    wageType: r.wageType,
  });

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
      if (isEdit) {
        // 元の行は更新(PUT)、追加した行は新規作成(POST)
        const originalRow = filledRows.find((r) => r.uid === originalUid);
        const newRows = filledRows.filter((r) => r.uid !== originalUid);

        if (originalRow) {
          const res = await fetch(`/api/reports/${editId}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reportDate,
              employeeId,
              truckId: truckId || null,
              ...rowPayload(originalRow),
              workItems: originalRow.workItems.length > 0 ? JSON.stringify(originalRow.workItems) : null,
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "エラーが発生しました");
          }
        }

        if (newRows.length > 0) {
          const res = await fetch("/api/reports/batch", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reportDate,
              employeeId,
              truckId: truckId || null,
              rows: newRows.map((r) => ({ ...rowPayload(r), workItems: r.workItems })),
            }),
          });
          if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || "エラーが発生しました");
          }
        }
        toast.success(newRows.length > 0 ? `更新1件・新規${newRows.length}件を保存しました` : "日報を更新しました");
      } else {
        // 新規: まとめてPOST
        const res = await fetch("/api/reports/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            reportDate,
            employeeId,
            truckId: truckId || null,
            rows: filledRows.map((r) => ({ ...rowPayload(r), workItems: r.workItems })),
          }),
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || "エラーが発生しました");
        }
        const data = await res.json();
        toast.success(`${data.count}件の日報を登録しました`);
      }
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
        <h1 className="text-3xl font-bold">{isEdit ? "日報編集" : "日報登録"}</h1>
        <p className="text-muted-foreground">
          {isEdit
            ? "この日報を編集します（行を追加すると同じ従業員・日付で新規登録されます）"
            : "同じ従業員・日付の配送を複数行まとめて登録します"}
        </p>
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
                    {employeeOptions.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id.toString()}>
                        {emp.name}{emp.isActive === false ? "（無効）" : ""}
                      </SelectItem>
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
                    {truckOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id.toString()}>
                        {t.vehicleNumber} ({t.vehicleName}){t.isActive === false ? "（無効）" : ""}
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
            <CardTitle>明細（{rows.length}件）</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="mr-2 h-4 w-4" />行を追加
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {rows.map((r, idx) => {
              const workItemOptions = r.wageType ? itemsForWageType(r.wageType) : [];
              return (
                <div key={r.uid} className="rounded-lg border p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-muted-foreground">{idx + 1}件目</span>
                    {r.uid !== originalUid && (
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                        onClick={() => removeRow(r.uid)} aria-label="この明細を削除">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    <Field label="得意先" required>
                      <CustomerAutocomplete id={`cust-${r.uid}`} value={r.customerName}
                        onSelect={(id, name) => {
                          updateRow(r.uid, "customerId", id);
                          updateRow(r.uid, "customerName", name);
                        }}
                        placeholder="得意先" />
                    </Field>
                    <Field label="発地住所">
                      <Input value={r.originAddress}
                        onChange={(e) => updateRow(r.uid, "originAddress", e.target.value)} placeholder="住所" />
                    </Field>
                    <Field label="発地" required>
                      <AutocompleteInput id={`origin-${r.uid}`} value={r.origin}
                        onChange={(v) => updateRow(r.uid, "origin", v)} field="origin" placeholder="発地" />
                    </Field>
                    <Field label="着地住所">
                      <Input value={r.destinationAddress}
                        onChange={(e) => updateRow(r.uid, "destinationAddress", e.target.value)} placeholder="住所" />
                    </Field>
                    <Field label="着地" required>
                      <AutocompleteInput id={`dest-${r.uid}`} value={r.destination}
                        onChange={(v) => updateRow(r.uid, "destination", v)} field="destination" placeholder="着地" />
                    </Field>
                    <Field label="品名">
                      <Input value={r.productName}
                        onChange={(e) => updateRow(r.uid, "productName", e.target.value)} placeholder="品名" />
                    </Field>
                    <Field label="数量">
                      <Input type="number" value={r.quantity}
                        onChange={(e) => updateRow(r.uid, "quantity", e.target.value)} />
                    </Field>
                    <Field label="給与形態">
                      <Select value={r.wageType || "_none"}
                        onValueChange={(v) => changeWageType(r.uid, v === "_none" ? "" : v)}>
                        <SelectTrigger><SelectValue placeholder="形態" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">（未選択）</SelectItem>
                          {wageTypes.map((wt) => (
                            <SelectItem key={wt} value={wt}>{wt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    <Field label="作業内容">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={!r.wageType}
                            className="w-full justify-between font-normal"
                          >
                            <span className="truncate">
                              {r.workItems.length > 0 ? r.workItems.join("、") : "作業内容"}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-56">
                          {workItemOptions.length === 0 ? (
                            <div className="px-2 py-1.5 text-xs text-muted-foreground">
                              給与形態を選択してください
                            </div>
                          ) : (
                            workItemOptions.map((wr) => (
                              <DropdownMenuCheckboxItem
                                key={wr.id}
                                checked={r.workItems.includes(wr.workItem)}
                                onCheckedChange={() => toggleWorkItem(r.uid, wr.workItem)}
                                onSelect={(e) => e.preventDefault()}
                              >
                                <span className="flex-1">{wr.workItem}</span>
                                <span className="ml-2 text-muted-foreground">
                                  ¥{Number(wr.rate).toLocaleString()}
                                </span>
                              </DropdownMenuCheckboxItem>
                            ))
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Field>
                    <Field label="給与">
                      <Input
                        type="number"
                        value={r.salary}
                        onChange={(e) => updateRow(r.uid, "salary", e.target.value)}
                        className={r.workItems.length > 0 ? "bg-muted" : ""}
                        title={r.workItems.length > 0 ? "作業内容から自動計算（手入力で上書き可）" : undefined}
                      />
                    </Field>
                    <Field label="運賃">
                      <Input type="number" value={r.fare}
                        onChange={(e) => updateRow(r.uid, "fare", e.target.value)} />
                    </Field>
                    <Field label="通行料">
                      <Input type="number" value={r.tollFee}
                        onChange={(e) => updateRow(r.uid, "tollFee", e.target.value)} />
                    </Field>
                    <Field label="距離手当">
                      <Input type="number" value={r.distanceAllowance}
                        onChange={(e) => updateRow(r.uid, "distanceAllowance", e.target.value)} />
                    </Field>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "保存中..." : isEdit ? "更新" : "登録"}
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/reports")}>
            キャンセル
          </Button>
        </div>
      </form>
    </div>
  );
}
