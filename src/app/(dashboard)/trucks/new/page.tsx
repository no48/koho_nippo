import { TruckForm } from "@/components/trucks/truck-form";

export default function NewTruckPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">トラック登録</h1>
        <p className="text-muted-foreground">新しいトラックを登録します</p>
      </div>
      <TruckForm />
    </div>
  );
}
