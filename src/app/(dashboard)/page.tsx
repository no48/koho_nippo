"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Truck, Users, Building2, ClipboardList } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

type DashboardStats = {
  truckCount: number;
  employeeCount: number;
  customerCount: number;
  monthlyReportCount: number;
  recentReports: {
    id: number;
    reportDate: string;
    origin: string;
    destination: string;
    employee: { name: string };
    customer: { name: string };
  }[];
};

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        } else {
          toast.error("ダッシュボードデータの取得に失敗しました");
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
        toast.error("ダッシュボードデータの取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  const statCards = [
    {
      title: "トラック",
      value: stats?.truckCount ?? "-",
      description: "登録台数",
      icon: Truck,
      href: "/trucks",
    },
    {
      title: "従業員",
      value: stats?.employeeCount ?? "-",
      description: "登録人数",
      icon: Users,
      href: "/employees",
    },
    {
      title: "得意先",
      value: stats?.customerCount ?? "-",
      description: "登録件数",
      icon: Building2,
      href: "/customers",
    },
    {
      title: "今月の日報",
      value: stats?.monthlyReportCount ?? "-",
      description: "登録件数",
      icon: ClipboardList,
      href: "/reports",
    },
  ];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">ダッシュボード</h1>
        <p className="text-muted-foreground">運送業基幹システムへようこそ</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
                <stat.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {loading ? (
                    <div className="h-8 w-12 bg-muted animate-pulse rounded" />
                  ) : (
                    stat.value
                  )}
                </div>
                <p className="text-xs text-muted-foreground">{stat.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>最近の日報</CardTitle>
            <CardDescription>直近の配送記録</CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-4 bg-muted animate-pulse rounded w-16" />
                  </div>
                ))}
              </div>
            ) : stats?.recentReports && stats.recentReports.length > 0 ? (
              <div className="space-y-3">
                {stats.recentReports.map((report) => (
                  <div key={report.id} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="text-muted-foreground">{formatDate(report.reportDate)}</span>
                      <span className="mx-2">{report.origin} → {report.destination}</span>
                    </div>
                    <span className="text-muted-foreground">{report.employee.name}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                日報を登録すると、ここに表示されます。
              </p>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>クイックアクション</CardTitle>
            <CardDescription>よく使う機能</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <Link
              href="/reports/new"
              className="block text-sm text-primary hover:underline"
            >
              + 日報を登録する
            </Link>
            <Link
              href="/invoices/new"
              className="block text-sm text-primary hover:underline"
            >
              + 請求書を作成する
            </Link>
            <Link
              href="/payrolls/new"
              className="block text-sm text-primary hover:underline"
            >
              + 給料明細を作成する
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
