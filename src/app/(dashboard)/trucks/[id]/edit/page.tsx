"use client";

import { useEffect, useState, use } from "react";
import { TruckForm } from "@/components/trucks/truck-form";

type Employee = {
  id: number;
  name: string;
  nameKana: string;
};

type Truck = {
  id: number;
  vehicleNumber: string;
  vehicleName: string;
  memo: string | null;
  employees: { employee: Employee }[];
};

export default function EditTruckPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [truck, setTruck] = useState<Truck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTruck = async () => {
      try {
        const response = await fetch(`/api/trucks/${id}`);
        if (response.ok) {
          const data = await response.json();
          setTruck(data);
        }
      } catch (error) {
        console.error("Failed to fetch truck:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchTruck();
  }, [id]);

  if (loading) {
    return <div className="text-center py-8">読み込み中...</div>;
  }

  if (!truck) {
    return <div className="text-center py-8">トラックが見つかりません</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">トラック編集</h1>
        <p className="text-muted-foreground">トラック情報を編集します</p>
      </div>
      <TruckForm truck={truck} isEdit />
    </div>
  );
}
