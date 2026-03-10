"use client";

import { useEffect, useState, use } from "react";
import { CustomerForm } from "@/components/customers/customer-form";

type Customer = {
  id: number;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  contactPerson: string | null;
  memo: string | null;
};

export default function EditCustomerPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`/api/customers/${id}`);
        if (response.ok) {
          const data = await response.json();
          setCustomer(data);
        }
      } catch (error) {
        console.error("Failed to fetch customer:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomer();
  }, [id]);

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (!customer) {
    return <div className="text-center py-8">得意先が見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">得意先編集</h1>
        <p className="text-muted-foreground">得意先情報を編集します</p>
      </div>
      <CustomerForm customer={customer} isEdit />
    </div>
  );
}
