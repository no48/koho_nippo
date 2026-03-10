"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Save, Users, ChevronRight, Mail, Send, Plus, X, FileText, DollarSign, Trash2 } from "lucide-react";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import Link from "next/link";

type WageRate = {
  id: number;
  wageType: string;
  workItem: string;
  rate: number;
  sortOrder: number;
};

// 給与形態の種類
const WAGE_TYPES = ["大型", "常用", "大型2", "大型3", "4t", "フォーク作業", "ライトバン"];

// デフォルトの作業項目
const DEFAULT_WORK_ITEMS = [
  "有給", "基本給", "2回目", "引取り", "移動", "横持", "待機",
  "積み置き", "距離手当", "適性診断", "立会手当", "皆勤手当", "愛車手当", "15回以上"
];

type CompanySettings = {
  companyName: string;
  companyZipcode: string;
  companyAddress: string;
  companyPhone: string;
  companyFax: string;
  invoiceRegistrationNumber: string;
  bankName: string;
  bankBranch: string;
  bankAccountType: string;
  bankAccountNumber: string;
  // SMTP設定
  smtpHost: string;
  smtpPort: string;
  smtpSecure: string;
  smtpUser: string;
  smtpPassword: string;
  smtpFromEmail: string;
  smtpFromName: string;
};

const defaultSettings: CompanySettings = {
  companyName: "",
  companyZipcode: "",
  companyAddress: "",
  companyPhone: "",
  companyFax: "",
  invoiceRegistrationNumber: "",
  bankName: "",
  bankBranch: "",
  bankAccountType: "普通",
  bankAccountNumber: "",
  // SMTP設定デフォルト
  smtpHost: "smtp.gmail.com",
  smtpPort: "587",
  smtpSecure: "false",
  smtpUser: "",
  smtpPassword: "",
  smtpFromEmail: "",
  smtpFromName: "",
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingEmail, setTestingEmail] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  // 日報種類の管理
  const [reportTypes, setReportTypes] = useState<string[]>([]);
  const [newReportType, setNewReportType] = useState("");

  // 単価マスタの管理
  const [wageRates, setWageRates] = useState<WageRate[]>([]);
  const [selectedWageType, setSelectedWageType] = useState<string>(WAGE_TYPES[0]);
  const [wageRatesLoading, setWageRatesLoading] = useState(false);
  const [newWorkItem, setNewWorkItem] = useState("");
  const [newRate, setNewRate] = useState("");

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch("/api/settings");
        if (res.ok) {
          const data = await res.json();
          setSettings({
            ...defaultSettings,
            ...data,
          });
          // 日報種類を取得（JSON文字列をパース）
          if (data.reportTypes) {
            try {
              setReportTypes(JSON.parse(data.reportTypes));
            } catch {
              setReportTypes([]);
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...settings,
          reportTypes: JSON.stringify(reportTypes),
        }),
      });

      if (res.ok) {
        toast.success("設定を保存しました");
      } else {
        throw new Error("Failed to save settings");
      }
    } catch (error) {
      console.error(error);
      toast.error("設定の保存に失敗しました");
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (key: keyof CompanySettings, value: string) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  // 日報種類の追加
  const handleAddReportType = () => {
    const trimmed = newReportType.trim();
    if (trimmed && !reportTypes.includes(trimmed)) {
      setReportTypes([...reportTypes, trimmed]);
      setNewReportType("");
    }
  };

  // 日報種類の削除
  const handleRemoveReportType = (typeToRemove: string) => {
    setReportTypes(reportTypes.filter((t) => t !== typeToRemove));
  };

  // 単価マスタの取得
  const fetchWageRates = async () => {
    setWageRatesLoading(true);
    try {
      const res = await fetch("/api/wage-rates");
      if (res.ok) {
        const data = await res.json();
        setWageRates(data);
      }
    } catch (error) {
      console.error("Failed to fetch wage rates:", error);
    } finally {
      setWageRatesLoading(false);
    }
  };

  useEffect(() => {
    fetchWageRates();
  }, []);

  // 単価の追加/更新
  const handleSaveWageRate = async (workItem: string, rate: string) => {
    const parsedRate = parseInt(rate, 10);
    if (isNaN(parsedRate)) {
      toast.error("単価は数値を入力してください");
      return;
    }

    try {
      const res = await fetch("/api/wage-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wageType: selectedWageType,
          workItem,
          rate: parsedRate,
        }),
      });

      if (res.ok) {
        toast.success("単価を保存しました");
        fetchWageRates();
      } else {
        throw new Error("Failed to save");
      }
    } catch (error) {
      console.error(error);
      toast.error("単価の保存に失敗しました");
    }
  };

  // 新しい作業項目を追加
  const handleAddWorkItem = async () => {
    const trimmedItem = newWorkItem.trim();
    const parsedRate = parseInt(newRate, 10);

    if (!trimmedItem) {
      toast.error("作業項目名を入力してください");
      return;
    }
    if (isNaN(parsedRate)) {
      toast.error("単価は数値を入力してください");
      return;
    }

    try {
      const res = await fetch("/api/wage-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          wageType: selectedWageType,
          workItem: trimmedItem,
          rate: parsedRate,
        }),
      });

      if (res.ok) {
        toast.success("作業項目を追加しました");
        setNewWorkItem("");
        setNewRate("");
        fetchWageRates();
      } else {
        throw new Error("Failed to add");
      }
    } catch (error) {
      console.error(error);
      toast.error("作業項目の追加に失敗しました");
    }
  };

  // 単価の削除
  const handleDeleteWageRate = async (id: number) => {
    if (!confirm("この単価を削除しますか？")) return;

    try {
      const res = await fetch(`/api/wage-rates?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("単価を削除しました");
        fetchWageRates();
      } else {
        throw new Error("Failed to delete");
      }
    } catch (error) {
      console.error(error);
      toast.error("単価の削除に失敗しました");
    }
  };

  // 選択された給与形態の単価を取得
  const getWageRatesForType = () => {
    return wageRates.filter((wr) => wr.wageType === selectedWageType);
  };

  const handleTestEmail = async () => {
    if (!testEmailAddress) {
      toast.error("テスト送信先のメールアドレスを入力してください");
      return;
    }
    if (!settings.smtpHost || !settings.smtpUser || !settings.smtpPassword) {
      toast.error("SMTP設定を入力してから保存してください");
      return;
    }

    setTestingEmail(true);
    try {
      const res = await fetch("/api/settings/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: testEmailAddress }),
      });

      if (res.ok) {
        toast.success("テストメールを送信しました");
      } else {
        const data = await res.json();
        throw new Error(data.error || "送信に失敗しました");
      }
    } catch (error) {
      console.error(error);
      toast.error(error instanceof Error ? error.message : "テストメールの送信に失敗しました");
    } finally {
      setTestingEmail(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">設定</h1>
        <p className="text-muted-foreground">
          会社情報や請求書に表示される内容を設定します
        </p>
      </div>

      {/* システム設定 */}
      <Card>
        <CardHeader>
          <CardTitle>システム設定</CardTitle>
          <CardDescription>ユーザーやシステムの管理</CardDescription>
        </CardHeader>
        <CardContent>
          <Link
            href="/settings/users"
            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Users className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium">ユーザー管理</p>
                <p className="text-sm text-muted-foreground">
                  ログインできるユーザーの追加・編集・削除
                </p>
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* 日報種類設定 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            日報種類
          </CardTitle>
          <CardDescription>
            日報の種類（集計、チャーターなど）を管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              value={newReportType}
              onChange={(e) => setNewReportType(e.target.value)}
              placeholder="例: 集計、チャーター"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddReportType();
                }
              }}
            />
            <Button type="button" onClick={handleAddReportType} variant="outline">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {reportTypes.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {reportTypes.map((type) => (
                <div
                  key={type}
                  className="flex items-center gap-1 bg-muted px-3 py-1 rounded-full text-sm"
                >
                  <span>{type}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveReportType(type)}
                    className="hover:text-destructive"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              日報種類が登録されていません。追加するには上の入力欄を使用してください。
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            ※ 変更後は「設定を保存」ボタンで保存してください
          </p>
        </CardContent>
      </Card>

      {/* 単価マスタ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            単価マスタ
          </CardTitle>
          <CardDescription>
            給与形態ごとの作業項目と単価を管理します
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={selectedWageType} onValueChange={setSelectedWageType}>
            <TabsList className="flex flex-wrap h-auto gap-1">
              {WAGE_TYPES.map((type) => (
                <TabsTrigger key={type} value={type} className="text-sm">
                  {type}
                </TabsTrigger>
              ))}
            </TabsList>

            {WAGE_TYPES.map((wageType) => (
              <TabsContent key={wageType} value={wageType} className="space-y-4">
                {wageRatesLoading ? (
                  <p className="text-sm text-muted-foreground">読み込み中...</p>
                ) : (
                  <>
                    {/* 単価一覧テーブル */}
                    <div className="border rounded-lg overflow-hidden">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left px-4 py-2 text-sm font-medium">作業項目</th>
                            <th className="text-right px-4 py-2 text-sm font-medium">単価</th>
                            <th className="w-20 px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody>
                          {getWageRatesForType().length === 0 ? (
                            <tr>
                              <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                                この給与形態の単価が登録されていません
                              </td>
                            </tr>
                          ) : (
                            getWageRatesForType().map((wr) => (
                              <tr key={wr.id} className="border-t">
                                <td className="px-4 py-2">{wr.workItem}</td>
                                <td className="px-4 py-2 text-right">
                                  <Input
                                    type="number"
                                    defaultValue={wr.rate}
                                    className="w-32 text-right ml-auto"
                                    onBlur={(e) => {
                                      if (e.target.value !== String(wr.rate)) {
                                        handleSaveWageRate(wr.workItem, e.target.value);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        e.currentTarget.blur();
                                      }
                                    }}
                                  />
                                </td>
                                <td className="px-4 py-2 text-center">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleDeleteWageRate(wr.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>

                    {/* 新規作業項目追加 */}
                    <div className="flex gap-2 items-end">
                      <div className="flex-1 space-y-1">
                        <Label className="text-sm">作業項目</Label>
                        <Input
                          value={newWorkItem}
                          onChange={(e) => setNewWorkItem(e.target.value)}
                          placeholder="例: 基本給"
                          list="default-work-items"
                        />
                        <datalist id="default-work-items">
                          {DEFAULT_WORK_ITEMS.map((item) => (
                            <option key={item} value={item} />
                          ))}
                        </datalist>
                      </div>
                      <div className="w-32 space-y-1">
                        <Label className="text-sm">単価</Label>
                        <Input
                          type="number"
                          value={newRate}
                          onChange={(e) => setNewRate(e.target.value)}
                          placeholder="例: 9500"
                        />
                      </div>
                      <Button type="button" onClick={handleAddWorkItem} variant="outline">
                        <Plus className="h-4 w-4 mr-1" />
                        追加
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>
            ))}
          </Tabs>

          <p className="text-xs text-muted-foreground">
            ※ 単価は自動保存されます（入力後Enterキーまたはフォーカスを外すと保存）
          </p>
        </CardContent>
      </Card>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 会社情報 */}
        <Card>
          <CardHeader>
            <CardTitle>会社情報</CardTitle>
            <CardDescription>
              請求書に表示される会社名・住所・連絡先
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">会社名</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => handleChange("companyName", e.target.value)}
                placeholder="例: 株式会社 高邦運輸"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyZipcode">郵便番号</Label>
                <Input
                  id="companyZipcode"
                  value={settings.companyZipcode}
                  onChange={(e) => handleChange("companyZipcode", e.target.value)}
                  placeholder="例: 367-0036"
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label htmlFor="companyAddress">住所</Label>
                <Input
                  id="companyAddress"
                  value={settings.companyAddress}
                  onChange={(e) => handleChange("companyAddress", e.target.value)}
                  placeholder="例: 埼玉県本庄市今井548番地4"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="companyPhone">電話番号</Label>
                <Input
                  id="companyPhone"
                  value={settings.companyPhone}
                  onChange={(e) => handleChange("companyPhone", e.target.value)}
                  placeholder="例: 0495-21-5348"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyFax">FAX番号</Label>
                <Input
                  id="companyFax"
                  value={settings.companyFax}
                  onChange={(e) => handleChange("companyFax", e.target.value)}
                  placeholder="例: 0495-21-9723"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 振込先口座 */}
        <Card>
          <CardHeader>
            <CardTitle>振込先口座</CardTitle>
            <CardDescription>
              請求書に記載される振込先口座情報
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankName">銀行名</Label>
                <Input
                  id="bankName"
                  value={settings.bankName}
                  onChange={(e) => handleChange("bankName", e.target.value)}
                  placeholder="例: 群馬銀行"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankBranch">支店名</Label>
                <Input
                  id="bankBranch"
                  value={settings.bankBranch}
                  onChange={(e) => handleChange("bankBranch", e.target.value)}
                  placeholder="例: 本庄支店"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccountType">口座種別</Label>
                <Select
                  value={settings.bankAccountType}
                  onValueChange={(value) => handleChange("bankAccountType", value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="口座種別を選択" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="普通">普通</SelectItem>
                    <SelectItem value="当座">当座</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAccountNumber">口座番号</Label>
                <Input
                  id="bankAccountNumber"
                  value={settings.bankAccountNumber}
                  onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
                  placeholder="例: 0603118"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* インボイス制度 */}
        <Card>
          <CardHeader>
            <CardTitle>インボイス制度</CardTitle>
            <CardDescription>
              適格請求書発行事業者の登録番号
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="invoiceRegistrationNumber">登録番号</Label>
              <Input
                id="invoiceRegistrationNumber"
                value={settings.invoiceRegistrationNumber}
                onChange={(e) => handleChange("invoiceRegistrationNumber", e.target.value)}
                placeholder="例: T-8030001060231"
              />
              <p className="text-sm text-muted-foreground">
                「T」から始まる13桁または14桁の番号を入力してください
              </p>
            </div>
          </CardContent>
        </Card>

        {/* メール設定 */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              メール設定 (SMTP)
            </CardTitle>
            <CardDescription>
              請求書のメール送信に使用するSMTP設定
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpHost">SMTPホスト</Label>
                <Input
                  id="smtpHost"
                  value={settings.smtpHost}
                  onChange={(e) => handleChange("smtpHost", e.target.value)}
                  placeholder="例: smtp.gmail.com"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">ポート</Label>
                  <Input
                    id="smtpPort"
                    value={settings.smtpPort}
                    onChange={(e) => handleChange("smtpPort", e.target.value)}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpSecure">SSL/TLS</Label>
                  <Select
                    value={settings.smtpSecure}
                    onValueChange={(value) => handleChange("smtpSecure", value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="選択" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="false">STARTTLS (587)</SelectItem>
                      <SelectItem value="true">SSL/TLS (465)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpUser">ユーザー名 (メールアドレス)</Label>
                <Input
                  id="smtpUser"
                  type="email"
                  value={settings.smtpUser}
                  onChange={(e) => handleChange("smtpUser", e.target.value)}
                  placeholder="例: info@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpPassword">パスワード / アプリパスワード</Label>
                <Input
                  id="smtpPassword"
                  type="password"
                  value={settings.smtpPassword}
                  onChange={(e) => handleChange("smtpPassword", e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="smtpFromEmail">送信元メールアドレス</Label>
                <Input
                  id="smtpFromEmail"
                  type="email"
                  value={settings.smtpFromEmail}
                  onChange={(e) => handleChange("smtpFromEmail", e.target.value)}
                  placeholder="例: noreply@example.com"
                />
                <p className="text-xs text-muted-foreground">
                  空欄の場合はユーザー名が使用されます
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="smtpFromName">送信者名</Label>
                <Input
                  id="smtpFromName"
                  value={settings.smtpFromName}
                  onChange={(e) => handleChange("smtpFromName", e.target.value)}
                  placeholder="例: 株式会社 高邦運輸"
                />
              </div>
            </div>

            <div className="border-t pt-4 mt-4">
              <Label className="mb-2 block">テスト送信</Label>
              <div className="flex gap-2">
                <Input
                  type="email"
                  value={testEmailAddress}
                  onChange={(e) => setTestEmailAddress(e.target.value)}
                  placeholder="テスト送信先メールアドレス"
                  className="flex-1"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleTestEmail}
                  disabled={testingEmail}
                >
                  <Send className="mr-2 h-4 w-4" />
                  {testingEmail ? "送信中..." : "テスト送信"}
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                設定を保存してからテスト送信を行ってください
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "保存中..." : "設定を保存"}
          </Button>
        </div>
      </form>
    </div>
  );
}
