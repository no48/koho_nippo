import { APIRequestContext } from "@playwright/test";

const BASE_URL = "http://localhost:3001";

/**
 * API helper for creating/deleting test data directly via API.
 * Uses authenticated request context from storageState.
 */
export class ApiHelper {
  constructor(private request: APIRequestContext) {}

  // ─── Trucks ──────────────────────────────────────────

  async createTruck(data: {
    vehicleNumber: string;
    vehicleName: string;
    memo?: string;
  }) {
    const res = await this.request.post(`${BASE_URL}/api/trucks`, {
      data,
    });
    if (!res.ok()) throw new Error(`Failed to create truck: ${res.status()}`);
    return res.json();
  }

  async deleteTruck(id: number) {
    const res = await this.request.delete(`${BASE_URL}/api/trucks/${id}`);
    if (!res.ok() && res.status() !== 404)
      throw new Error(`Failed to delete truck: ${res.status()}`);
  }

  // ─── Employees ───────────────────────────────────────

  async createEmployee(data: {
    name: string;
    nameKana: string;
    phone?: string;
    wageType?: string;
    baseSalary?: number;
    memo?: string;
  }) {
    const res = await this.request.post(`${BASE_URL}/api/employees`, {
      data,
    });
    if (!res.ok())
      throw new Error(`Failed to create employee: ${res.status()}`);
    return res.json();
  }

  async deleteEmployee(id: number) {
    const res = await this.request.delete(`${BASE_URL}/api/employees/${id}`);
    if (!res.ok() && res.status() !== 404)
      throw new Error(`Failed to delete employee: ${res.status()}`);
  }

  // ─── Customers ───────────────────────────────────────

  async createCustomer(data: {
    name: string;
    address?: string;
    phone?: string;
    contactPerson?: string;
    email?: string;
    memo?: string;
  }) {
    const res = await this.request.post(`${BASE_URL}/api/customers`, {
      data,
    });
    if (!res.ok())
      throw new Error(`Failed to create customer: ${res.status()}`);
    return res.json();
  }

  async deleteCustomer(id: number) {
    const res = await this.request.delete(`${BASE_URL}/api/customers/${id}`);
    if (!res.ok() && res.status() !== 404)
      throw new Error(`Failed to delete customer: ${res.status()}`);
  }

  // ─── Daily Reports ──────────────────────────────────

  async createReport(data: {
    reportDate: string;
    employeeId: number;
    truckId: number;
    customerId: number;
    origin: string;
    destination: string;
    fare: number;
    tollFee?: number;
    productName?: string;
    memo?: string;
  }) {
    const res = await this.request.post(`${BASE_URL}/api/reports`, {
      data,
    });
    if (!res.ok()) throw new Error(`Failed to create report: ${res.status()}`);
    return res.json();
  }

  async deleteReport(id: number) {
    const res = await this.request.delete(`${BASE_URL}/api/reports/${id}`);
    if (!res.ok() && res.status() !== 404)
      throw new Error(`Failed to delete report: ${res.status()}`);
  }

  // ─── Invoices ────────────────────────────────────────

  async createInvoice(data: {
    customerId: number;
    issueDate: string;
    items: Array<{
      itemDate: string;
      description: string;
      amount: number;
      tollFee?: number;
      dailyReportId?: number;
    }>;
  }) {
    const res = await this.request.post(`${BASE_URL}/api/invoices`, {
      data,
    });
    if (!res.ok())
      throw new Error(`Failed to create invoice: ${res.status()}`);
    return res.json();
  }

  async deleteInvoice(id: number) {
    const res = await this.request.delete(`${BASE_URL}/api/invoices/${id}`);
    if (!res.ok() && res.status() !== 404)
      throw new Error(`Failed to delete invoice: ${res.status()}`);
  }

  async issueInvoice(id: number) {
    const res = await this.request.post(
      `${BASE_URL}/api/invoices/${id}/issue`
    );
    if (!res.ok())
      throw new Error(`Failed to issue invoice: ${res.status()}`);
    return res.json();
  }

  // ─── Payrolls ────────────────────────────────────────

  async createPayroll(data: {
    employeeId: number;
    yearMonth: string;
    baseSalary: number;
    allowances?: Array<{ name: string; amount: number }>;
    deductions?: Array<{ name: string; amount: number }>;
  }) {
    const res = await this.request.post(`${BASE_URL}/api/payrolls`, {
      data,
    });
    if (!res.ok())
      throw new Error(`Failed to create payroll: ${res.status()}`);
    return res.json();
  }

  async deletePayroll(id: number) {
    const res = await this.request.delete(`${BASE_URL}/api/payrolls/${id}`);
    if (!res.ok() && res.status() !== 404)
      throw new Error(`Failed to delete payroll: ${res.status()}`);
  }

  // ─── Checklist ───────────────────────────────────────

  async createChecklistItem(data: {
    title: string;
    priority?: string;
    dueDate?: string;
  }) {
    const res = await this.request.post(`${BASE_URL}/api/checklist`, {
      data,
    });
    if (!res.ok())
      throw new Error(`Failed to create checklist item: ${res.status()}`);
    return res.json();
  }

  async deleteChecklistItem(id: number) {
    const res = await this.request.delete(`${BASE_URL}/api/checklist/${id}`);
    if (!res.ok() && res.status() !== 404)
      throw new Error(`Failed to delete checklist item: ${res.status()}`);
  }
}
