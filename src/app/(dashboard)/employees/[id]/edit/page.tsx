"use client";

import { useEffect, useState, use } from "react";
import { EmployeeForm } from "@/components/employees/employee-form";

type Truck = {
  id: number;
  vehicleNumber: string;
  vehicleName: string;
};

type Employee = {
  id: number;
  name: string;
  nameKana: string;
  phone: string | null;
  memo: string | null;
  baseSalary: string | number | null;
  wageType: string | null;
  trucks: { truck: Truck }[];
};

export default function EditEmployeePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEmployee = async () => {
      try {
        const response = await fetch(`/api/employees/${id}`);
        if (response.ok) {
          const data = await response.json();
          setEmployee(data);
        }
      } catch (error) {
        console.error("Failed to fetch employee:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchEmployee();
  }, [id]);

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (!employee) {
    return <div className="text-center py-8">従業員が見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">従業員編集</h1>
        <p className="text-muted-foreground">従業員情報を編集します</p>
      </div>
      <EmployeeForm employee={employee} isEdit />
    </div>
  );
}
