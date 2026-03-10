import { CustomerForm } from "@/components/customers/customer-form";

export default function NewCustomerPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">得意先登録</h1>
        <p className="text-muted-foreground">新しい得意先を登録します</p>
      </div>
      <CustomerForm />
    </div>
  );
}
