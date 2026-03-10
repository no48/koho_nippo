"use client";

import { useEffect, useState, use } from "react";
import { ReportForm } from "@/components/reports/report-form";

type DailyReport = {
  id: number;
  reportNumber: string;
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
  distanceAllowance: string | number | null;
  workItems: string | null;
  wageType: string | null;
  memo: string | null;
};

export default function EditReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [report, setReport] = useState<DailyReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const response = await fetch(`/api/reports/${id}`);
        if (response.ok) {
          const data = await response.json();
          setReport(data);
        }
      } catch (error) {
        console.error("Failed to fetch report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReport();
  }, [id]);

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (!report) {
    return <div className="text-center py-8">日報が見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">日報編集</h1>
        <p className="text-muted-foreground">
          No. {report.reportNumber}
        </p>
      </div>
      <ReportForm report={report} isEdit />
    </div>
  );
}
