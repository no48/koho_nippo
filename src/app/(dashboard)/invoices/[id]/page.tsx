"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteInput } from "@/components/ui/autocomplete-input";
import { Pencil, Printer, Check, Download, Mail, Plus, FileText } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

type Customer = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
};

type DailyReport = {
  id: number;
  reportDate: string;
  origin: string;
  destination: string;
  productName: string | null;
  tollFee: string | number | null;
  employee?: { id: number; name: string };
  truck?: { id: number; vehicleNumber: string };
};

type InvoiceItem = {
  id: number;
  itemDate: string;
  description: string;
  amount: string | number;
  tollFee: string | number | null;  // 手動入力用通行料
  dailyReport: DailyReport | null;
  dailyReports: DailyReport[];  // 請求書→日報フロー用
};

type Employee = {
  id: number;
  name: string;
  wageType: string | null;
};

type Truck = {
  id: number;
  vehicleNumber: string;
  vehicleName: string;
};

type WageRate = {
  id: number;
  wageType: string;
  workItem: string;
  rate: number;
  sortOrder: number;
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

type CompanySettings = {
  companyName?: string;
  companyZipcode?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyFax?: string;
  invoiceRegistrationNumber?: string;
  bankName?: string;
  bankBranch?: string;
  bankAccountType?: string;
  bankAccountNumber?: string;
};

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<CompanySettings>({});
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);

  // 日報作成モーダル用
  const [showReportModal, setShowReportModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState<InvoiceItem | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [trucks, setTrucks] = useState<Truck[]>([]);
  const [reportTypes, setReportTypes] = useState<string[]>([]);
  const [wageRates, setWageRates] = useState<WageRate[]>([]);
  const [selectedWageType, setSelectedWageType] = useState<string>("");
  const [selectedWorkItems, setSelectedWorkItems] = useState<string[]>([]);
  const [creatingReport, setCreatingReport] = useState(false);
  const [reportFormData, setReportFormData] = useState({
    employeeId: "",
    truckId: "",
    origin: "",
    destination: "",
    productName: "",
    tollFee: "",
    salary: "",
    wageType: "",
    reportType: "",
    distanceAllowance: "",
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [invoiceRes, settingsRes, employeesRes, trucksRes, wageRatesRes] = await Promise.all([
          fetch(`/api/invoices/${id}`),
          fetch("/api/settings"),
          fetch("/api/employees?active=true"),
          fetch("/api/trucks?active=true"),
          fetch("/api/wage-rates"),
        ]);

        if (invoiceRes.ok) {
          setInvoice(await invoiceRes.json());
        }
        if (settingsRes.ok) {
          const data = await settingsRes.json();
          setSettings(data);
          if (data.reportTypes) {
            try {
              setReportTypes(JSON.parse(data.reportTypes));
            } catch {
              setReportTypes([]);
            }
          }
        }
        if (employeesRes.ok) {
          setEmployees(await employeesRes.json());
        }
        if (trucksRes.ok) {
          setTrucks(await trucksRes.json());
        }
        if (wageRatesRes.ok) {
          setWageRates(await wageRatesRes.json());
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  // 日報作成モーダルを開く
  const handleOpenReportModal = (item: InvoiceItem) => {
    setSelectedItem(item);
    // 請求書情報から初期値を設定
    setReportFormData({
      employeeId: "",
      truckId: "",
      origin: "",
      destination: "",
      productName: "",
      tollFee: "",
      salary: "",
      wageType: "",
      reportType: "",
      distanceAllowance: "",
    });
    setSelectedWageType("");
    setSelectedWorkItems([]);
    setShowReportModal(true);
  };

  // 給与形態関連ロジック
  const getAvailableWageTypes = (): string[] => {
    const types = new Set(wageRates.map((wr) => wr.wageType));
    return Array.from(types).sort();
  };

  const getWorkItemsForWageType = () => {
    return wageRates.filter((wr) => wr.wageType === selectedWageType);
  };

  const handleWageTypeChange = (newWageType: string) => {
    if (newWageType !== selectedWageType) {
      setSelectedWageType(newWageType);
      setSelectedWorkItems([]);
    }
  };

  const handleWorkItemToggle = (workItem: string) => {
    setSelectedWorkItems((prev) =>
      prev.includes(workItem)
        ? prev.filter((item) => item !== workItem)
        : [...prev, workItem]
    );
  };

  const calculateSalary = (): number => {
    return getWorkItemsForWageType()
      .filter((wr) => selectedWorkItems.includes(wr.workItem))
      .reduce((sum, wr) => sum + Number(wr.rate), 0);
  };

  // 作業項目または給与形態が変更されたとき、給与を自動計算
  useEffect(() => {
    setReportFormData((prev) => ({
      ...prev,
      wageType: selectedWageType,
    }));

    if (selectedWorkItems.length > 0 && selectedWageType) {
      const calculatedSalary = calculateSalary();
      setReportFormData((prev) => ({
        ...prev,
        salary: calculatedSalary.toString(),
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWorkItems, selectedWageType, wageRates]);

  // 日報を作成
  const handleCreateReport = async () => {
    if (!selectedItem || !invoice) return;

    if (!reportFormData.employeeId || !reportFormData.truckId || !reportFormData.origin || !reportFormData.destination) {
      toast.error("従業員、トラック、発地、着地は必須です");
      return;
    }

    setCreatingReport(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportDate: selectedItem.itemDate,
          employeeId: reportFormData.employeeId,
          truckId: reportFormData.truckId,
          customerId: invoice.customer.id,
          origin: reportFormData.origin,
          destination: reportFormData.destination,
          productName: reportFormData.productName || null,
          fare: typeof selectedItem.amount === "string" ? parseInt(selectedItem.amount) : selectedItem.amount,
          tollFee: reportFormData.tollFee ? parseInt(reportFormData.tollFee) : 0,
          salary: reportFormData.salary ? parseInt(reportFormData.salary) : null,
          wageType: reportFormData.wageType || null,
          reportType: reportFormData.reportType || null,
          workItems: selectedWorkItems.length > 0 ? JSON.stringify(selectedWorkItems) : null,
          distanceAllowance: reportFormData.distanceAllowance ? parseInt(reportFormData.distanceAllowance) : 0,
          memo: selectedItem.description,
          invoiceItemId: selectedItem.id,  // 請求書明細と紐付け
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "日報の作成に失敗しました");
      }

      toast.success("日報を作成しました");
      setShowReportModal(false);

      // 請求書データを再取得
      const invoiceRes = await fetch(`/api/invoices/${id}`);
      if (invoiceRes.ok) {
        setInvoice(await invoiceRes.json());
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "日報の作成に失敗しました");
    } finally {
      setCreatingReport(false);
    }
  };

  const handleIssue = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/issue`, {
        method: "POST",
      });
      if (response.ok) {
        toast.success("請求書を発行しました");
        const data = await response.json();
        setInvoice(data);
      }
    } catch (error) {
      console.error(error);
      toast.error("発行に失敗しました");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await fetch(`/api/invoices/${id}/pdf`);
      if (!response.ok) {
        throw new Error("PDF生成に失敗しました");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `請求書_${invoice?.invoiceNumber}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success("PDFをダウンロードしました");
    } catch (error) {
      console.error(error);
      toast.error("PDFのダウンロードに失敗しました");
    }
  };

  const handleSendEmail = async () => {
    if (!invoice?.customer.email) {
      toast.error("得意先のメールアドレスが登録されていません");
      return;
    }

    if (!confirm(`${invoice.customer.email} に請求書を送信しますか？`)) {
      return;
    }

    setSendingEmail(true);
    try {
      const response = await fetch(`/api/invoices/${id}/send-email`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "送信に失敗しました");
      }

      toast.success(data.message);
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "メール送信に失敗しました");
    } finally {
      setSendingEmail(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
  };

  const formatShortDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const formatCurrency = (amount: string | number) => {
    const num = typeof amount === "string" ? parseFloat(amount) : amount;
    return num.toLocaleString("ja-JP");
  };

  // Calculate toll fee total (ソースは排他的に選択、二重計上を防止)
  const tollFeeTotal = invoice?.items.reduce((sum, item) => {
    let itemTollFee = 0;
    if (item.dailyReport?.tollFee) {
      // 日報→請求書フロー
      itemTollFee = typeof item.dailyReport.tollFee === "string" ? parseFloat(item.dailyReport.tollFee) : item.dailyReport.tollFee;
    } else if (item.dailyReports?.length > 0) {
      // 請求書→日報フロー
      itemTollFee = item.dailyReports.reduce((rSum, r) => {
        const fee = r.tollFee ? (typeof r.tollFee === "string" ? parseFloat(r.tollFee) : r.tollFee) : 0;
        return rSum + fee;
      }, 0);
    } else if (item.tollFee) {
      // 手動入力のみ
      itemTollFee = typeof item.tollFee === "string" ? parseFloat(item.tollFee) : item.tollFee;
    }
    return sum + itemTollFee;
  }, 0) || 0;

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (!invoice) {
    return <div className="text-center py-8">請求書が見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header - hidden when printing */}
      <div className="flex items-center justify-between print:hidden">
        <div>
          <h1 className="text-3xl font-bold">請求書詳細</h1>
          <p className="text-muted-foreground">
            請求書番号: {invoice.invoiceNumber}
          </p>
        </div>
        <div className="flex gap-2">
          {invoice.status === "draft" && (
            <>
              <Button variant="outline" asChild>
                <Link href={`/invoices/${id}/edit`}>
                  <Pencil className="mr-2 h-4 w-4" />
                  編集
                </Link>
              </Button>
              <Button onClick={handleIssue}>
                <Check className="mr-2 h-4 w-4" />
                発行
              </Button>
            </>
          )}
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="mr-2 h-4 w-4" />
            印刷
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf}>
            <Download className="mr-2 h-4 w-4" />
            PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleSendEmail}
            disabled={sendingEmail || !invoice?.customer.email}
            title={!invoice?.customer.email ? "得意先のメールアドレスが未登録です" : ""}
          >
            <Mail className="mr-2 h-4 w-4" />
            {sendingEmail ? "送信中..." : "メール送信"}
          </Button>
        </div>
      </div>

      {/* Invoice content - printable (A4 landscape style) */}
      <div className="print:p-4 bg-white">
        <div className="max-w-[1000px] mx-auto p-8 border print:border-none print:p-0">
          {/* Header Row */}
          <div className="flex justify-between items-start mb-6">
            {/* Left: Invoice Number Box */}
            <div className="border border-black px-4 py-2">
              <span className="text-sm">{invoice.invoiceNumber.split("-")[0]}-</span>
            </div>

            {/* Center: Title */}
            <h1 className="text-2xl font-bold tracking-wider">請求明細書</h1>

            {/* Right: Date and No */}
            <div className="text-right">
              <p>{formatDate(invoice.issueDate)}</p>
              <p className="text-sm">No. {invoice.invoiceNumber.split("-")[1] || "1"}</p>
            </div>
          </div>

          {/* Customer and Company Info Row */}
          <div className="flex justify-between mb-6">
            {/* Left: Customer */}
            <div className="w-1/2">
              <div className="border-b border-black pb-1 mb-2">
                {invoice.customer.address && (
                  <p className="text-sm">{invoice.customer.address.split(" ")[0]}</p>
                )}
              </div>
              <div className="border-b border-black pb-1 mb-2">
                <p className="text-sm">{invoice.customer.address?.split(" ").slice(1).join(" ") || ""}</p>
              </div>
              <div className="flex items-end">
                <p className="text-lg font-bold">{invoice.customer.name}</p>
                <span className="ml-4 text-sm">御中</span>
              </div>
              <Badge
                variant={invoice.status === "issued" ? "default" : "secondary"}
                className="print:hidden mt-2"
              >
                {invoice.status === "issued" ? "発行済" : "下書き"}
              </Badge>
            </div>

            {/* Right: Company Info */}
            <div className="text-right text-sm">
              <p className="font-bold">{settings.companyName || "株式会社 〇〇運輸"}</p>
              <p>〒{settings.companyZipcode || "000-0000"} {settings.companyAddress || ""}</p>
              <p>TEL {settings.companyPhone || ""} FAX {settings.companyFax || ""}</p>
              <p className="mt-2">お振込み口座は、以下の通りとなります。</p>
              <p>（銀行名）{settings.bankName || ""} {settings.bankBranch || ""} {settings.bankAccountType || ""} （口座番号）{settings.bankAccountNumber || ""}</p>
            </div>
          </div>

          {/* Summary Table */}
          <div className="mb-4">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <td className="w-1/4"></td>
                  <td className="border border-black bg-gray-100 text-center py-1 text-sm font-bold">当月売上額</td>
                  <td className="border border-black bg-gray-100 text-center py-1 text-sm font-bold">通行料</td>
                  <td className="border border-black bg-gray-100 text-center py-1 text-sm font-bold">消費税額</td>
                  <td className="border border-black bg-gray-100 text-center py-1 text-sm font-bold">当月分請求額</td>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="w-1/4"></td>
                  <td className="border border-black text-right py-1 px-2">¥{formatCurrency(invoice.subtotal)}</td>
                  <td className="border border-black text-right py-1 px-2">¥{formatCurrency(tollFeeTotal)}</td>
                  <td className="border border-black text-right py-1 px-2">¥{formatCurrency(invoice.tax)}</td>
                  <td className="border border-black text-right py-1 px-2 font-bold">¥{formatCurrency(invoice.total)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Registration Number */}
          <p className="text-sm mb-2">登録番号：{settings.invoiceRegistrationNumber || "T-0000000000000"}</p>

          {/* Detail Table */}
          <table className="w-full border-collapse text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black py-1 px-2 w-16">月日</th>
                <th className="border border-black py-1 px-2">発地名</th>
                <th className="border border-black py-1 px-2">着地名</th>
                <th className="border border-black py-1 px-2">品名</th>
                <th className="border border-black py-1 px-2 w-20 text-right">通行料</th>
                <th className="border border-black py-1 px-2 w-24 text-right">金額</th>
                <th className="border border-black py-1 px-2 w-16 text-center print:hidden">日報</th>
                <th className="border border-black py-1 px-2 w-20 print:hidden">操作</th>
              </tr>
            </thead>
            <tbody>
              {invoice.items.map((item) => {
                // 通行料を計算（ソースは排他的に選択、二重計上を防止）
                let tollFeeIncTax = 0;
                if (item.dailyReport?.tollFee) {
                  // 日報→請求書フロー
                  tollFeeIncTax = typeof item.dailyReport.tollFee === "string" ? parseFloat(item.dailyReport.tollFee) : item.dailyReport.tollFee;
                } else if (item.dailyReports?.length > 0) {
                  // 請求書→日報フロー
                  tollFeeIncTax = item.dailyReports.reduce((sum, r) => {
                    const fee = r.tollFee ? (typeof r.tollFee === "string" ? parseFloat(r.tollFee) : r.tollFee) : 0;
                    return sum + fee;
                  }, 0);
                } else if (item.tollFee) {
                  // 手動入力のみ
                  tollFeeIncTax = typeof item.tollFee === "string" ? parseFloat(item.tollFee) : item.tollFee;
                }
                const tollFeeExcTax = Math.round(tollFeeIncTax / 1.1);

                // 日報数（日報→請求書フローと請求書→日報フローの合計）
                const reportCount = (item.dailyReport ? 1 : 0) + (item.dailyReports?.length || 0);

                // 発着地と品名（日報から取得、なければ手動入力時は説明から推測）
                const origin = item.dailyReport?.origin || item.dailyReports?.[0]?.origin || "-";
                const destination = item.dailyReport?.destination || item.dailyReports?.[0]?.destination || "-";
                const productName = item.dailyReport?.productName || item.dailyReports?.[0]?.productName || "-";

                return (
                  <tr key={item.id}>
                    <td className="border border-black py-1 px-2 text-center">
                      {formatShortDate(item.itemDate)}
                    </td>
                    <td className="border border-black py-1 px-2 text-xs">
                      {origin}
                    </td>
                    <td className="border border-black py-1 px-2 text-xs">
                      {destination}
                    </td>
                    <td className="border border-black py-1 px-2 text-xs">
                      {productName}
                    </td>
                    <td className="border border-black py-1 px-2 text-right">
                      {tollFeeExcTax > 0 ? formatCurrency(tollFeeExcTax) : "-"}
                    </td>
                    <td className="border border-black py-1 px-2 text-right">
                      {formatCurrency(item.amount)}
                    </td>
                    <td className="border border-black py-1 px-2 text-center print:hidden">
                      {reportCount > 0 ? (
                        <Badge variant="secondary" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {reportCount}件
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                    <td className="border border-black py-1 px-2 text-center print:hidden">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenReportModal(item)}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        日報
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {/* Empty rows to fill the page */}
              {Array.from({ length: Math.max(0, 10 - invoice.items.length) }).map((_, i) => (
                <tr key={`empty-${i}`}>
                  <td className="border border-black py-1 px-2">&nbsp;</td>
                  <td className="border border-black py-1 px-2"></td>
                  <td className="border border-black py-1 px-2"></td>
                  <td className="border border-black py-1 px-2"></td>
                  <td className="border border-black py-1 px-2"></td>
                  <td className="border border-black py-1 px-2"></td>
                  <td className="border border-black py-1 px-2 print:hidden"></td>
                  <td className="border border-black py-1 px-2 print:hidden"></td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Tax Summary */}
          <div className="mt-4 flex justify-between">
            <div></div>
            <table className="border-collapse text-sm">
              <tbody>
                <tr>
                  <td className="border border-black py-1 px-4 bg-gray-100">【10%】対象金額</td>
                  <td className="border border-black py-1 px-4 text-right w-32">¥{formatCurrency(invoice.subtotal)}</td>
                </tr>
                <tr>
                  <td className="border border-black py-1 px-4 bg-gray-100">【10%】消費税額</td>
                  <td className="border border-black py-1 px-4 text-right">¥{formatCurrency(invoice.tax)}</td>
                </tr>
                <tr>
                  <td className="border border-black py-1 px-4 bg-gray-100">【 小　計 】</td>
                  <td className="border border-black py-1 px-4 text-right">
                    <span className="mr-4">{invoice.items.length}</span>
                    ¥{formatCurrency(invoice.subtotal)}
                  </td>
                </tr>
                <tr>
                  <td className="border border-black py-1 px-4 bg-gray-100 font-bold">【 合　計 】</td>
                  <td className="border border-black py-1 px-4 text-right font-bold">
                    <span className="mr-4">{invoice.items.length}</span>
                    ¥{formatCurrency(invoice.total)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="print:hidden">
        <Button variant="outline" onClick={() => router.push("/invoices")}>
          一覧に戻る
        </Button>
      </div>

      {/* 日報作成モーダル */}
      <Dialog open={showReportModal} onOpenChange={setShowReportModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>日報作成（請求書明細から）</DialogTitle>
          </DialogHeader>
          {selectedItem && (
            <div className="space-y-6">
              {/* 自動入力セクション */}
              <div className="bg-muted/50 p-4 rounded-lg">
                <h4 className="font-medium mb-3 text-sm">▼ 自動入力（請求書から取得）</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">日付:</span>
                    <span className="ml-2">{formatDate(selectedItem.itemDate)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">得意先:</span>
                    <span className="ml-2">{invoice?.customer.name}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">運賃:</span>
                    <span className="ml-2">¥{formatCurrency(selectedItem.amount)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">備考:</span>
                    <span className="ml-2 text-xs">{selectedItem.description}</span>
                  </div>
                </div>
              </div>

              {/* 日報種類・給与形態・作業内容 */}
              {(reportTypes.length > 0 || getAvailableWageTypes().length > 0) && (
                <div className="space-y-4">
                  {reportTypes.length > 0 && (
                    <div className="space-y-2">
                      <Label>日報種類</Label>
                      <Select
                        value={reportFormData.reportType || "_none"}
                        onValueChange={(value) =>
                          setReportFormData({ ...reportFormData, reportType: value === "_none" ? "" : value })
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

                      {selectedWageType && getWorkItemsForWageType().length > 0 && (
                        <>
                          <div className="space-y-2">
                            <Label>作業内容</Label>
                            <div className="grid grid-cols-2 gap-2">
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
                </div>
              )}

              {/* 手動入力セクション（必須） */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">▼ 手動入力（必須）</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>従業員 <span className="text-destructive">*</span></Label>
                    <Select
                      value={reportFormData.employeeId}
                      onValueChange={(value) =>
                        setReportFormData({ ...reportFormData, employeeId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {employees.map((emp) => (
                          <SelectItem key={emp.id} value={emp.id.toString()}>
                            {emp.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>トラック <span className="text-destructive">*</span></Label>
                    <Select
                      value={reportFormData.truckId}
                      onValueChange={(value) =>
                        setReportFormData({ ...reportFormData, truckId: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="選択してください" />
                      </SelectTrigger>
                      <SelectContent>
                        {trucks.map((truck) => (
                          <SelectItem key={truck.id} value={truck.id.toString()}>
                            {truck.vehicleNumber} ({truck.vehicleName})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>発地 <span className="text-destructive">*</span></Label>
                    <AutocompleteInput
                      id="modal-origin"
                      value={reportFormData.origin}
                      onChange={(value) =>
                        setReportFormData({ ...reportFormData, origin: value })
                      }
                      placeholder="例: 埼玉県杉戸町 平田倉庫㈱"
                      field="origin"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>着地 <span className="text-destructive">*</span></Label>
                    <AutocompleteInput
                      id="modal-destination"
                      value={reportFormData.destination}
                      onChange={(value) =>
                        setReportFormData({ ...reportFormData, destination: value })
                      }
                      placeholder="例: 茨城県常総市 王子コンテナー㈱"
                      field="destination"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 任意入力セクション */}
              <div className="space-y-4">
                <h4 className="font-medium text-sm">▼ 任意入力</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>品名</Label>
                    <Input
                      value={reportFormData.productName}
                      onChange={(e) =>
                        setReportFormData({ ...reportFormData, productName: e.target.value })
                      }
                      placeholder="例: 段ボール"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>通行料（税込）</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                      <Input
                        type="number"
                        value={reportFormData.tollFee}
                        onChange={(e) =>
                          setReportFormData({ ...reportFormData, tollFee: e.target.value })
                        }
                        placeholder="1000"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>距離手当</Label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">¥</span>
                      <Input
                        type="number"
                        value={reportFormData.distanceAllowance}
                        onChange={(e) =>
                          setReportFormData({ ...reportFormData, distanceAllowance: e.target.value })
                        }
                        placeholder="1000"
                        className="pl-8"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>
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
                        type="number"
                        value={reportFormData.salary}
                        onChange={(e) =>
                          setReportFormData({ ...reportFormData, salary: e.target.value })
                        }
                        placeholder="15000"
                        className={`pl-8 ${selectedWorkItems.length > 0 ? "bg-muted" : ""}`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* ボタン */}
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowReportModal(false)}
                >
                  キャンセル
                </Button>
                <Button
                  type="button"
                  onClick={handleCreateReport}
                  disabled={creatingReport}
                >
                  {creatingReport ? "作成中..." : "日報を作成"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }
          body * {
            visibility: hidden;
          }
          .print\\:p-4,
          .print\\:p-4 * {
            visibility: visible;
          }
          .print\\:p-4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .print\\:hidden {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
