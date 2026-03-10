import { EmployeeForm } from "@/components/employees/employee-form";

export default function NewEmployeePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">従業員登録</h1>
        <p className="text-muted-foreground">新しい従業員を登録します</p>
      </div>
      <EmployeeForm />
    </div>
  );
}
