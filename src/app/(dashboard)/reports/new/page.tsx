import { ReportForm } from "@/components/reports/report-form";

export default function NewReportPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">日報登録</h1>
        <p className="text-muted-foreground">新しい日報を登録します</p>
      </div>
      <ReportForm />
    </div>
  );
}
