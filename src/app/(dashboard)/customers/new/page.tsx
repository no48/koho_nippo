import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">発注元登録</h1>
        <p className="text-muted-foreground">新しい発注元を登録します</p>
      </div>
      <CustomerForm />
    </div>
  );
}
